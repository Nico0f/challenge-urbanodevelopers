import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service } from '../entities/service.entity';
import { BillingPending } from '../entities/billing-pending.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service, BillingPending])],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
