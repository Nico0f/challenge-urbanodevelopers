import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ErpSyncStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  ERROR = 'ERROR',
}

export class SyncInvoicesDto {
  @ApiProperty({
    description: 'Array of invoice IDs to sync with ERP',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  invoiceIds: number[];
}

export class SyncBatchDto {
  @ApiProperty({
    description: 'Batch ID to sync with ERP',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  batchId: number;
}

export class ErpInvoiceDataDto {
  @ApiProperty({ example: 'A-0001-00000001' })
  invoiceNumber: string;

  @ApiProperty({ example: '12345678901234' })
  cae: string;

  @ApiProperty({ example: '2024-01-31' })
  issueDate: string;

  @ApiProperty({ example: 1500.5 })
  amount: number;

  @ApiProperty({ example: 1 })
  customerId: number;

  @ApiProperty({ example: '2024-01-15' })
  serviceDate: string;

  @ApiProperty({ example: 'A-0001' })
  receiptBook: string;

  @ApiProperty({ example: 1 })
  batchId: number;

  @ApiProperty({
    description: 'Accounting entries for the invoice',
    type: 'array',
  })
  accountingEntries: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
}

export class ErpSyncResponseDto {
  @ApiProperty({
    description: 'Unique sync transaction ID',
    example: 'SYNC-2024-001',
  })
  syncId: string;

  @ApiProperty({
    description: 'Sync status',
    enum: ErpSyncStatus,
    example: ErpSyncStatus.SENT,
  })
  status: ErpSyncStatus;

  @ApiProperty({
    description: 'Timestamp of the sync operation',
    example: '2024-01-31T15:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Data sent to ERP',
    type: [ErpInvoiceDataDto],
  })
  data: ErpInvoiceDataDto[];

  @ApiProperty({
    description: 'Summary of the sync operation',
  })
  summary: {
    totalInvoices: number;
    totalAmount: number;
    success: boolean;
    message: string;
  };
}

export class ErpSyncHistoryFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ErpSyncStatus,
  })
  @IsOptional()
  @IsEnum(ErpSyncStatus)
  status?: ErpSyncStatus;

  @ApiPropertyOptional({
    description: 'Filter by date from',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date to',
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

export class ErpSyncHistoryItemDto {
  @ApiProperty({ example: 'SYNC-2024-001' })
  syncId: string;

  @ApiProperty({ enum: ErpSyncStatus })
  status: ErpSyncStatus;

  @ApiProperty({ example: '2024-01-31T15:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 5 })
  invoiceCount: number;

  @ApiProperty({ example: 7500.5 })
  totalAmount: number;

  @ApiPropertyOptional({ example: null })
  errorMessage?: string;
}
