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
    description: 'Batch processing status: PENDING_PROCESSING, IN_PROCESS, PROCESSED, ERROR',
  })
  status: BatchStatus;

  @ApiPropertyOptional({ example: null })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Processing start timestamp',
    example: '2024-01-31T10:00:00.000Z',
  })
  processingStartedAt?: Date;

  @ApiPropertyOptional({
    description: 'Processing completion timestamp',
    example: '2024-01-31T10:00:05.000Z',
  })
  processingCompletedAt?: Date;

  @ApiProperty({ example: 3 })
  totalInvoices: number;

  @ApiProperty({ example: 4500.5 })
  totalAmount: number;

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

export class QueueInfoDto {
  @ApiProperty({ example: 'batch-1' })
  jobId: string;

  @ApiProperty({ example: 'queued' })
  status: string;

  @ApiProperty({ example: 'Batch 1 has been queued for processing. Check status at GET /billing-batches/1/status' })
  message: string;
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

  @ApiPropertyOptional({
    description: 'Queue information (only for async processing)',
    type: QueueInfoDto,
  })
  queueInfo?: QueueInfoDto;
}

export class JobInfoDto {
  @ApiProperty({ example: 'batch-1' })
  jobId: string;

  @ApiProperty({ 
    example: 'active',
    description: 'Job status: waiting, active, completed, failed, delayed',
  })
  status: string;

  @ApiProperty({ 
    example: 75,
    description: 'Processing progress (0-100)',
  })
  progress: number;

  @ApiProperty({ example: 0 })
  attemptsMade: number;

  @ApiPropertyOptional({ 
    example: 'Connection timeout',
    description: 'Error reason if job failed',
  })
  failedReason?: string;
}

export class BatchStatusResponseDto {
  @ApiProperty({
    description: 'Batch details',
    type: BillingBatchResponseDto,
  })
  batch: BillingBatchResponseDto;

  @ApiPropertyOptional({
    description: 'Queue job information (null if job completed or not found)',
    type: JobInfoDto,
  })
  jobInfo: JobInfoDto | null;
}

export class QueueStatsResponseDto {
  @ApiProperty({ 
    example: 5,
    description: 'Number of jobs waiting to be processed',
  })
  waiting: number;

  @ApiProperty({ 
    example: 2,
    description: 'Number of jobs currently being processed',
  })
  active: number;

  @ApiProperty({ 
    example: 100,
    description: 'Number of completed jobs (kept in memory)',
  })
  completed: number;

  @ApiProperty({ 
    example: 3,
    description: 'Number of failed jobs',
  })
  failed: number;

  @ApiProperty({ 
    example: 0,
    description: 'Number of delayed jobs',
  })
  delayed: number;
}
