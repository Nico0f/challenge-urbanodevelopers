import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PendingStatus } from '../../entities/billing-pending.entity';

export class BillingPendingFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: PendingStatus,
  })
  @IsOptional()
  @IsEnum(PendingStatus)
  status?: PendingStatus;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Filter by service date from',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by service date to',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

export class BillingPendingResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  serviceId: number;

  @ApiProperty({
    example: 'PENDING',
    enum: PendingStatus,
  })
  status: PendingStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Associated service details',
    type: 'object',
  })
  service?: {
    id: number;
    serviceDate: Date;
    customerId: number;
    amount: number;
    status: string;
  };
}

export class PaginatedBillingPendingResponseDto {
  @ApiProperty({ type: [BillingPendingResponseDto] })
  data: BillingPendingResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

export class BillingPendingSummaryDto {
  @ApiProperty({ example: 50 })
  totalPending: number;

  @ApiProperty({ example: 25000.5 })
  totalAmount: number;

  @ApiProperty({
    description: 'Breakdown by customer',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        customerId: { type: 'number' },
        count: { type: 'number' },
        totalAmount: { type: 'number' },
      },
    },
  })
  byCustomer: {
    customerId: number;
    count: number;
    totalAmount: number;
  }[];
}
