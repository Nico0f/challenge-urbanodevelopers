import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BillingBatch, BatchStatus } from '../entities/billing-batch.entity';
import { Invoice } from '../entities/invoice.entity';
import { BillingPending, PendingStatus } from '../entities/billing-pending.entity';
import { Service, ServiceStatus } from '../entities/service.entity';

export const BILLING_BATCH_QUEUE = 'billing-batch-queue';

export interface BillingBatchJobData {
  batchId: number;
  pendingIds: number[];
  issueDate: string;
  receiptBook: string;
}

export interface BillingBatchJobResult {
  batchId: number;
  totalInvoices: number;
  totalAmount: number;
  successfulPendings: number[];
  failedPendings: { id: number; reason: string }[];
}

@Processor(BILLING_BATCH_QUEUE)
export class BillingBatchProcessor {
  private readonly logger = new Logger(BillingBatchProcessor.name);

  constructor(
    @InjectRepository(BillingBatch)
    private readonly batchRepository: Repository<BillingBatch>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(BillingPending)
    private readonly pendingRepository: Repository<BillingPending>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly dataSource: DataSource,
  ) {}

  @OnQueueActive()
  onActive(job: Job<BillingBatchJobData>) {
    this.logger.log(
      `Processing job ${job.id} for batch ${job.data.batchId}...`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<BillingBatchJobData>, result: BillingBatchJobResult) {
    this.logger.log(
      `Job ${job.id} completed. Batch ${result.batchId} processed with ${result.totalInvoices} invoices.`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<BillingBatchJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for batch ${job.data.batchId}: ${error.message}`,
      error.stack,
    );
  }

  @Process()
  async processBillingBatch(job: Job<BillingBatchJobData>): Promise<BillingBatchJobResult> {
    const { batchId, pendingIds, issueDate, receiptBook } = job.data;

    this.logger.log(`Starting to process batch ${batchId} with ${pendingIds.length} pendings`);

    // Update batch status to IN_PROCESS
    await this.batchRepository.update(batchId, {
      status: BatchStatus.IN_PROCESS,
      processingStartedAt: new Date(),
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Fetch all pendings with their services
      const pendings = await queryRunner.manager.find(BillingPending, {
        where: pendingIds.map(id => ({ id })),
        relations: ['service'],
      });

      // Validate pendings
      const validPendings: BillingPending[] = [];
      const failedPendings: { id: number; reason: string }[] = [];

      for (const pending of pendings) {
        if (!pending) {
          continue;
        }

        if (pending.status !== PendingStatus.PENDING) {
          failedPendings.push({
            id: pending.id,
            reason: `Pending is not in PENDING status (current: ${pending.status})`,
          });
          continue;
        }

        if (!pending.service) {
          failedPendings.push({
            id: pending.id,
            reason: 'Service not found for pending',
          });
          continue;
        }

        validPendings.push(pending);
      }

      // Check for not found pendings
      const foundIds = pendings.map(p => p?.id).filter(Boolean);
      const notFoundIds = pendingIds.filter(id => !foundIds.includes(id));
      for (const id of notFoundIds) {
        failedPendings.push({ id, reason: 'Pending not found' });
      }

      if (validPendings.length === 0) {
        throw new Error('No valid pendings to process');
      }

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

      // Process each valid pending
      for (const pending of validPendings) {
        // Update job progress
        const progress = Math.round(
          ((validPendings.indexOf(pending) + 1) / validPendings.length) * 100,
        );
        await job.progress(progress);

        const invoiceNumber = `${receiptBook}-${String(sequenceNumber).padStart(8, '0')}`;
        const cae = this.generateCAE();

        const invoice = this.invoiceRepository.create({
          invoiceNumber,
          cae,
          issueDate: new Date(issueDate),
          amount: pending.service.amount,
          batchId,
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

      // Update batch with success status
      await this.batchRepository.update(batchId, {
        status: BatchStatus.PROCESSED,
        processingCompletedAt: new Date(),
        totalInvoices: createdInvoices.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        errorMessage: null,
      });

      this.logger.log(
        `Batch ${batchId} processed successfully: ${createdInvoices.length} invoices created`,
      );

      return {
        batchId,
        totalInvoices: createdInvoices.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        successfulPendings,
        failedPendings,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Update batch with error status
      await this.batchRepository.update(batchId, {
        status: BatchStatus.ERROR,
        processingCompletedAt: new Date(),
        errorMessage: error.message,
      });

      this.logger.error(
        `Failed to process batch ${batchId}: ${error.message}`,
        error.stack,
      );

      throw error;
    } finally {
      await queryRunner.release();
    }
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
