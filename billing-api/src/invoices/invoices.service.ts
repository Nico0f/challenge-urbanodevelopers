import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceFilterDto, InvoiceStatisticsDto } from './dto/invoice.dto';
import { EntityNotFoundException } from '../common';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async findAll(filterDto: InvoiceFilterDto): Promise<{
    data: Invoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      batchId,
      customerId,
      invoiceNumber,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
    } = filterDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.batch', 'batch')
      .leftJoinAndSelect('invoice.pending', 'pending')
      .leftJoinAndSelect('pending.service', 'service')
      .orderBy('invoice.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (batchId) {
      queryBuilder.andWhere('invoice.batchId = :batchId', { batchId });
    }

    if (customerId) {
      queryBuilder.andWhere('service.customerId = :customerId', { customerId });
    }

    if (invoiceNumber) {
      queryBuilder.andWhere('invoice.invoiceNumber LIKE :invoiceNumber', {
        invoiceNumber: `%${invoiceNumber}%`,
      });
    }

    if (dateFrom) {
      queryBuilder.andWhere('invoice.issueDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('invoice.issueDate <= :dateTo', { dateTo });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('invoice.amount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('invoice.amount <= :maxAmount', { maxAmount });
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

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['batch', 'pending', 'pending.service'],
    });

    if (!invoice) {
      throw new EntityNotFoundException('Invoice', id);
    }

    return invoice;
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceNumber },
      relations: ['batch', 'pending', 'pending.service'],
    });

    if (!invoice) {
      throw new EntityNotFoundException('Invoice', invoiceNumber);
    }

    return invoice;
  }

  async getStatistics(): Promise<InvoiceStatisticsDto> {
    const invoices = await this.invoiceRepository.find({
      relations: ['pending', 'pending.service'],
    });

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

    // Group by month
    const monthMap = new Map<string, { count: number; totalAmount: number }>();
    for (const invoice of invoices) {
      const date = new Date(invoice.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(monthKey) || { count: 0, totalAmount: 0 };
      existing.count++;
      existing.totalAmount += Number(invoice.amount);
      monthMap.set(monthKey, existing);
    }

    const byMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    // Group by customer
    const customerMap = new Map<number, { count: number; totalAmount: number }>();
    for (const invoice of invoices) {
      const customerId = invoice.pending?.service?.customerId;
      if (customerId) {
        const existing = customerMap.get(customerId) || { count: 0, totalAmount: 0 };
        existing.count++;
        existing.totalAmount += Number(invoice.amount);
        customerMap.set(customerId, existing);
      }
    }

    const byCustomer = Array.from(customerMap.entries())
      .map(([customerId, data]) => ({
        customerId,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalInvoices,
      totalAmount: Math.round(totalAmount * 100) / 100,
      averageAmount: Math.round(averageAmount * 100) / 100,
      byMonth,
      byCustomer,
    };
  }

  async findByCustomer(customerId: number): Promise<Invoice[]> {
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.batch', 'batch')
      .leftJoinAndSelect('invoice.pending', 'pending')
      .leftJoinAndSelect('pending.service', 'service')
      .where('service.customerId = :customerId', { customerId })
      .orderBy('invoice.issueDate', 'DESC')
      .getMany();
  }

  async findByBatch(batchId: number): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { batchId },
      relations: ['pending', 'pending.service'],
      order: { invoiceNumber: 'ASC' },
    });
  }
}
