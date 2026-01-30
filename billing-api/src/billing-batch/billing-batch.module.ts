import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BillingBatchController } from './billing-batch.controller';
import { BillingBatchService } from './billing-batch.service';
import { BillingBatch } from '../entities/billing-batch.entity';
import { Invoice } from '../entities/invoice.entity';
import { BillingPending } from '../entities/billing-pending.entity';
import { Service } from '../entities/service.entity';
import { BillingPendingModule } from '../billing-pending/billing-pending.module';
import { BillingBatchProcessor, BILLING_BATCH_QUEUE } from '../queue/billing-batch.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingBatch, Invoice, BillingPending, Service]),
    BillingPendingModule,
    BullModule.registerQueue({
      name: BILLING_BATCH_QUEUE,
    }),
  ],
  controllers: [BillingBatchController],
  providers: [BillingBatchService, BillingBatchProcessor],
  exports: [BillingBatchService],
})
export class BillingBatchModule {}
