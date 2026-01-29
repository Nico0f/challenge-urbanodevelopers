import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingBatchController } from './billing-batch.controller';
import { BillingBatchService } from './billing-batch.service';
import { BillingBatch } from '../entities/billing-batch.entity';
import { Invoice } from '../entities/invoice.entity';
import { BillingPending } from '../entities/billing-pending.entity';
import { Service } from '../entities/service.entity';
import { BillingPendingModule } from '../billing-pending/billing-pending.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingBatch, Invoice, BillingPending, Service]),
    BillingPendingModule,
  ],
  controllers: [BillingBatchController],
  providers: [BillingBatchService],
  exports: [BillingBatchService],
})
export class BillingBatchModule {}
