import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, In } from 'typeorm';
import { Service, ServiceStatus } from '../entities/service.entity';
import { BillingPending, PendingStatus } from '../entities/billing-pending.entity';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceFilterDto,
  SendToBillingDto,
} from './dto/service.dto';
import {
  EntityNotFoundException,
  ServiceAlreadyBilledException,
  BusinessException,
} from '../common';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(BillingPending)
    private readonly billingPendingRepository: Repository<BillingPending>,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const service = this.serviceRepository.create({
      serviceDate: new Date(createServiceDto.serviceDate),
      customerId: createServiceDto.customerId,
      amount: createServiceDto.amount,
      status: ServiceStatus.CREATED,
    });

    const savedService = await this.serviceRepository.save(service);
    this.logger.log(`Service created with ID: ${savedService.id}`);
    return savedService;
  }

  async findAll(
    filterDto: ServiceFilterDto,
  ): Promise<{ data: Service[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10, customerId, status, dateFrom, dateTo } = filterDto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Service> = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status as ServiceStatus;
    }

    if (dateFrom && dateTo) {
      where.serviceDate = Between(new Date(dateFrom), new Date(dateTo));
    }

    const [data, total] = await this.serviceRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['pendings'],
    });

    if (!service) {
      throw new EntityNotFoundException('Service', id);
    }

    return service;
  }

  async update(id: number, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id);

    // Only allow updates if service is in CREATED status
    if (service.status !== ServiceStatus.CREATED) {
      throw new BusinessException(
        `Cannot update service in status '${service.status}'. Only services with status 'CREATED' can be updated.`,
      );
    }

    if (updateServiceDto.serviceDate) {
      service.serviceDate = new Date(updateServiceDto.serviceDate);
    }
    if (updateServiceDto.customerId !== undefined) {
      service.customerId = updateServiceDto.customerId;
    }
    if (updateServiceDto.amount !== undefined) {
      service.amount = updateServiceDto.amount;
    }

    const updatedService = await this.serviceRepository.save(service);
    this.logger.log(`Service ${id} updated`);
    return updatedService;
  }

  async remove(id: number): Promise<void> {
    const service = await this.findOne(id);

    // Only allow deletion if service is in CREATED status
    if (service.status !== ServiceStatus.CREATED) {
      throw new BusinessException(
        `Cannot delete service in status '${service.status}'. Only services with status 'CREATED' can be deleted.`,
      );
    }

    await this.serviceRepository.remove(service);
    this.logger.log(`Service ${id} deleted`);
  }

  async sendToBilling(sendToBillingDto: SendToBillingDto): Promise<{
    success: number[];
    failed: { id: number; reason: string }[];
    pendings: BillingPending[];
  }> {
    const { serviceIds } = sendToBillingDto;
    const success: number[] = [];
    const failed: { id: number; reason: string }[] = [];
    const createdPendings: BillingPending[] = [];

    // Fetch all services at once
    const services = await this.serviceRepository.find({
      where: { id: In(serviceIds) },
    });

    const foundIds = services.map((s) => s.id);
    const notFoundIds = serviceIds.filter((id) => !foundIds.includes(id));

    // Mark not found services as failed
    notFoundIds.forEach((id) => {
      failed.push({ id, reason: 'Service not found' });
    });

    for (const service of services) {
      // Check if service is already sent to billing or invoiced
      if (service.status !== ServiceStatus.CREATED) {
        failed.push({
          id: service.id,
          reason: `Service is in status '${service.status}'. Only services with status 'CREATED' can be sent to billing.`,
        });
        continue;
      }

      // Check if there's already a pending for this service
      const existingPending = await this.billingPendingRepository.findOne({
        where: { serviceId: service.id },
      });

      if (existingPending) {
        failed.push({
          id: service.id,
          reason: 'Service already has a billing pending',
        });
        continue;
      }

      // Create billing pending
      const pending = this.billingPendingRepository.create({
        serviceId: service.id,
        status: PendingStatus.PENDING,
      });

      const savedPending = await this.billingPendingRepository.save(pending);

      // Update service status
      service.status = ServiceStatus.SENT_TO_BILL;
      await this.serviceRepository.save(service);

      success.push(service.id);
      createdPendings.push(savedPending);
    }

    this.logger.log(
      `Send to billing completed: ${success.length} successful, ${failed.length} failed`,
    );

    return {
      success,
      failed,
      pendings: createdPendings,
    };
  }

  async findByStatus(status: ServiceStatus): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { status },
      order: { createdAt: 'ASC' },
    });
  }

  async findByCustomer(customerId: number): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { customerId },
      order: { serviceDate: 'DESC' },
    });
  }
}
