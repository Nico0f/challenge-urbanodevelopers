import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { BillingBatch, BatchStatus } from '../entities/billing-batch.entity';
import { Invoice } from '../entities/invoice.entity';
import { BillingPending, PendingStatus } from '../entities/billing-pending.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import {
  CreateBillingBatchDto,
  BillingBatchFilterDto,
  BatchCreationResultDto,
} from './dto/billing-batch.dto';
import {
  EntityNotFoundException,
  EmptyBatchException,
  BatchProcessingException,
} from '../common';
import { BillingPendingService } from '../billing-pending/billing-pending.service';

@Injectable()
export class BillingBatchService {
  private readonly logger = new Logger(BillingBatchService.name);

  constructor(
    @InjectRepository(BillingBatch)
    private readonly batchRepository: Repository<BillingBatch>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(BillingPending)
    private readonly pendingRepository: Repository<BillingPending>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly billingPendingService: BillingPendingService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createBatchDto: CreateBillingBatchDto): Promise<BatchCreationResultDto> {
    const { issueDate, receiptBook, pendingIds } = createBatchDto;

    if (!pendingIds || pendingIds.length === 0) {
      throw new EmptyBatchException();
    }

    // Validate pendings
    const { valid, invalid } = await this.billingPendingService.validatePendingsForBilling(pendingIds);

    if (valid.length === 0) {
      throw new EmptyBatchException();
    }

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the batch
      const batch = this.batchRepository.create({
        issueDate: new Date(issueDate),
        receiptBook,
        status: BatchStatus.PROCESSED,
      });

      const savedBatch = await queryRunner.manager.save(batch);

      // Get the last invoice number for this receipt book
      const lastInvoice = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .where('invoice.invoiceNumber LIKE :prefix', { prefix: `${receiptBook}-%` })
        .orderBy('invoice.invoiceNumber', 'DESC')
        .getOne();

      let sequenceNumber = 1;
      if (lastInvoice) {
        const parts = lastInvoice.invoiceNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNumber)) {
          sequenceNumber = lastNumber + 1;
        }
      }

      const createdInvoices: Invoice[] = [];
      const successfulPendings: number[] = [];
      let totalAmount = 0;

      // Create invoices for each valid pending
      for (const pending of valid) {
        const invoiceNumber = `${receiptBook}-${String(sequenceNumber).padStart(8, '0')}`;
        const cae = this.generateCAE();

        const invoice = this.invoiceRepository.create({
          invoiceNumber,
          cae,
          issueDate: new Date(issueDate),
          amount: pending.service.amount,
          batchId: savedBatch.id,
          pendingId: pending.id,
        });

        const savedInvoice = await queryRunner.manager.save(invoice);
        createdInvoices.push(savedInvoice);

        // Update pending status
        pending.status = PendingStatus.INVOICED;
        await queryRunner.manager.save(pending);

        // Update service status
        const service = await queryRunner.manager.findOne(Service, {
          where: { id: pending.serviceId },
        });
        if (service) {
          service.status = ServiceStatus.INVOICED;
          await queryRunner.manager.save(service);
        }

        successfulPendings.push(pending.id);
        totalAmount += Number(pending.service.amount);
        sequenceNumber++;
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Billing batch ${savedBatch.id} created with ${createdInvoices.length} invoices`,
      );

      // Reload batch with invoices
      const completeBatch = await this.findOne(savedBatch.id);

      return {
        batch: completeBatch,
        summary: {
          totalInvoices: createdInvoices.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          successfulPendings,
          failedPendings: invalid,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create billing batch: ${error.message}`, error.stack);
      throw new BatchProcessingException(
        'Failed to create billing batch',
        { originalError: error.message },
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filterDto: BillingBatchFilterDto): Promise<{
    data: BillingBatch[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, status, receiptBook, dateFrom, dateTo } = filterDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.batchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.invoices', 'invoice')
      .leftJoinAndSelect('invoice.pending', 'pending')
      .leftJoinAndSelect('pending.service', 'service')
      .orderBy('batch.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('batch.status = :status', { status });
    }

    if (receiptBook) {
      queryBuilder.andWhere('batch.receiptBook = :receiptBook', { receiptBook });
    }

    if (dateFrom) {
      queryBuilder.andWhere('batch.issueDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('batch.issueDate <= :dateTo', { dateTo });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<BillingBatch> {
    const batch = await this.batchRepository.findOne({
      where: { id },
      relations: ['invoices', 'invoices.pending', 'invoices.pending.service'],
    });

    if (!batch) {
      throw new EntityNotFoundException('BillingBatch', id);
    }

    return batch;
  }

  async getReceiptBooks(): Promise<string[]> {
    const result = await this.batchRepository
      .createQueryBuilder('batch')
      .select('DISTINCT batch.receiptBook', 'receiptBook')
      .orderBy('batch.receiptBook', 'ASC')
      .getRawMany();

    return result.map((r) => r.receiptBook);
  }

  async getNextInvoiceNumber(receiptBook: string): Promise<string> {
    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNumber LIKE :prefix', { prefix: `${receiptBook}-%` })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let sequenceNumber = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('-');
      const lastNumber = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNumber)) {
        sequenceNumber = lastNumber + 1;
      }
    }

    return `${receiptBook}-${String(sequenceNumber).padStart(8, '0')}`;
  }

  private generateCAE(): string {
    // Simulate CAE generation (in production, this would come from AFIP)
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${timestamp}${random}`.slice(0, 14);
  }
}
