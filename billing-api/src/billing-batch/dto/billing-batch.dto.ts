import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsDateString,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BatchStatus } from '../../entities/billing-batch.entity';

export class CreateBillingBatchDto {
  @ApiProperty({
    description: 'Issue date for all invoices in the batch',
    example: '2024-01-31',
  })
  @IsNotEmpty()
  @IsDateString()
  issueDate: string;

  @ApiProperty({
    description: 'Receipt book identifier (talonario)',
    example: 'A-0001',
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  receiptBook: string;

  @ApiProperty({
    description: 'Array of billing pending IDs to include in the batch',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  pendingIds: number[];
}

export class BillingBatchFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BatchStatus,
  })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @ApiPropertyOptional({
    description: 'Filter by receipt book',
    example: 'A-0001',
  })
  @IsOptional()
  @IsString()
  receiptBook?: string;

  @ApiPropertyOptional({
    description: 'Filter by issue date from',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by issue date to',
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

export class InvoiceInBatchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'A-0001-00000001' })
  invoiceNumber: string;

  @ApiProperty({ example: '12345678901234' })
  cae: string;

  @ApiProperty({ example: '2024-01-31' })
  issueDate: Date;

  @ApiProperty({ example: 1500.5 })
  amount: number;

  @ApiProperty({ example: 1 })
  pendingId: number;

  @ApiPropertyOptional({
    description: 'Associated service details',
  })
  service?: {
    id: number;
    serviceDate: Date;
    customerId: number;
  };
}

export class BillingBatchResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2024-01-31' })
  issueDate: Date;

  @ApiProperty({ example: 'A-0001' })
  receiptBook: string;

  @ApiProperty({
    example: 'PROCESSED',
    enum: BatchStatus,
  })
  status: BatchStatus;

  @ApiPropertyOptional({ example: null })
  errorMessage?: string;

  @ApiProperty({ type: [InvoiceInBatchDto] })
  invoices: InvoiceInBatchDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedBillingBatchResponseDto {
  @ApiProperty({ type: [BillingBatchResponseDto] })
  data: BillingBatchResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

export class BatchCreationResultDto {
  @ApiProperty({
    description: 'Created batch details',
    type: BillingBatchResponseDto,
  })
  batch: BillingBatchResponseDto;

  @ApiProperty({
    description: 'Summary of the operation',
    example: {
      totalInvoices: 3,
      totalAmount: 4500.5,
      successfulPendings: [1, 2, 3],
      failedPendings: [],
    },
  })
  summary: {
    totalInvoices: number;
    totalAmount: number;
    successfulPendings: number[];
    failedPendings: { id: number; reason: string }[];
  };
}
