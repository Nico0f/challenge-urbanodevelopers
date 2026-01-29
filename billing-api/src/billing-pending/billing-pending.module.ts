import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPendingController } from './billing-pending.controller';
import { BillingPendingService } from './billing-pending.service';
import { BillingPending } from '../entities/billing-pending.entity';
import { Service } from '../entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BillingPending, Service])],
  controllers: [BillingPendingController],
  providers: [BillingPendingService],
  exports: [BillingPendingService],
})
export class BillingPendingModule {}
