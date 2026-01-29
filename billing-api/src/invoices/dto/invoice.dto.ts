import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by batch ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  batchId?: number;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Filter by invoice number (partial match)',
    example: 'A-0001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

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
    description: 'Minimum amount',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum amount',
    example: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

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

export class InvoiceResponseDto {
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
  batchId: number;

  @ApiProperty({ example: 1 })
  pendingId: number;

  @ApiPropertyOptional({
    description: 'Service details',
  })
  service?: {
    id: number;
    serviceDate: Date;
    customerId: number;
    amount: number;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedInvoicesResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  data: InvoiceResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

export class InvoiceStatisticsDto {
  @ApiProperty({ example: 100 })
  totalInvoices: number;

  @ApiProperty({ example: 150000.5 })
  totalAmount: number;

  @ApiProperty({ example: 1500.005 })
  averageAmount: number;

  @ApiProperty({
    description: 'Invoices grouped by month',
    type: 'array',
  })
  byMonth: {
    month: string;
    count: number;
    totalAmount: number;
  }[];

  @ApiProperty({
    description: 'Invoices grouped by customer',
    type: 'array',
  })
  byCustomer: {
    customerId: number;
    count: number;
    totalAmount: number;
  }[];
}
