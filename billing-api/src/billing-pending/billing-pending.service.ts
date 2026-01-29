import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BillingPending, PendingStatus } from '../entities/billing-pending.entity';
import { Service } from '../entities/service.entity';
import { BillingPendingFilterDto, BillingPendingSummaryDto } from './dto/billing-pending.dto';
import { EntityNotFoundException, PendingAlreadyInvoicedException } from '../common';

@Injectable()
export class BillingPendingService {
  private readonly logger = new Logger(BillingPendingService.name);

  constructor(
    @InjectRepository(BillingPending)
    private readonly billingPendingRepository: Repository<BillingPending>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async findAll(filterDto: BillingPendingFilterDto): Promise<{
    data: BillingPending[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, status, customerId, dateFrom, dateTo } = filterDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.billingPendingRepository
      .createQueryBuilder('pending')
      .leftJoinAndSelect('pending.service', 'service')
      .orderBy('pending.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('pending.status = :status', { status });
    }

    if (customerId) {
      queryBuilder.andWhere('service.customerId = :customerId', { customerId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('service.serviceDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('service.serviceDate <= :dateTo', { dateTo });
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

  async findOne(id: number): Promise<BillingPending> {
    const pending = await this.billingPendingRepository.findOne({
      where: { id },
      relations: ['service', 'invoices'],
    });

    if (!pending) {
      throw new EntityNotFoundException('BillingPending', id);
    }

    return pending;
  }

  async findPendingItems(): Promise<BillingPending[]> {
    return this.billingPendingRepository.find({
      where: { status: PendingStatus.PENDING },
      relations: ['service'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByIds(ids: number[]): Promise<BillingPending[]> {
    return this.billingPendingRepository.find({
      where: { id: In(ids) },
      relations: ['service'],
    });
  }

  async getSummary(): Promise<BillingPendingSummaryDto> {
    const pendings = await this.billingPendingRepository.find({
      where: { status: PendingStatus.PENDING },
      relations: ['service'],
    });

    const totalPending = pendings.length;
    const totalAmount = pendings.reduce(
      (sum, p) => sum + Number(p.service?.amount || 0),
      0,
    );

    // Group by customer
    const customerMap = new Map<number, { count: number; totalAmount: number }>();
    for (const pending of pendings) {
      const customerId = pending.service?.customerId;
      if (customerId) {
        const existing = customerMap.get(customerId) || { count: 0, totalAmount: 0 };
        existing.count++;
        existing.totalAmount += Number(pending.service.amount || 0);
        customerMap.set(customerId, existing);
      }
    }

    const byCustomer = Array.from(customerMap.entries()).map(([customerId, data]) => ({
      customerId,
      count: data.count,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
    }));

    return {
      totalPending,
      totalAmount: Math.round(totalAmount * 100) / 100,
      byCustomer,
    };
  }

  async markAsInvoiced(pendingIds: number[]): Promise<void> {
    await this.billingPendingRepository.update(
      { id: In(pendingIds) },
      { status: PendingStatus.INVOICED },
    );
    this.logger.log(`Marked ${pendingIds.length} pendings as invoiced`);
  }

  async validatePendingsForBilling(pendingIds: number[]): Promise<{
    valid: BillingPending[];
    invalid: { id: number; reason: string }[];
  }> {
    const pendings = await this.findByIds(pendingIds);
    const valid: BillingPending[] = [];
    const invalid: { id: number; reason: string }[] = [];

    const foundIds = pendings.map((p) => p.id);
    const notFoundIds = pendingIds.filter((id) => !foundIds.includes(id));

    notFoundIds.forEach((id) => {
      invalid.push({ id, reason: 'Billing pending not found' });
    });

    for (const pending of pendings) {
      if (pending.status !== PendingStatus.PENDING) {
        invalid.push({
          id: pending.id,
          reason: `Pending is already in status '${pending.status}'`,
        });
      } else {
        valid.push(pending);
      }
    }

    return { valid, invalid };
  }

  async cancel(id: number): Promise<void> {
    const pending = await this.findOne(id);

    if (pending.status !== PendingStatus.PENDING) {
      throw new PendingAlreadyInvoicedException(id);
    }

    // Remove the pending and revert service status
    const service = await this.serviceRepository.findOne({
      where: { id: pending.serviceId },
    });

    if (service) {
      service.status = 'CREATED' as any;
      await this.serviceRepository.save(service);
    }

    await this.billingPendingRepository.remove(pending);
    this.logger.log(`Billing pending ${id} cancelled`);
  }
}
