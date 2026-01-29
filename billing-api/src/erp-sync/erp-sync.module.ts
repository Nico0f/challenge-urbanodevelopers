import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErpSyncController } from './erp-sync.controller';
import { ErpSyncService } from './erp-sync.service';
import { Invoice } from '../entities/invoice.entity';
import { BillingBatch } from '../entities/billing-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, BillingBatch])],
  controllers: [ErpSyncController],
  providers: [ErpSyncService],
  exports: [ErpSyncService],
})
export class ErpSyncModule {}
