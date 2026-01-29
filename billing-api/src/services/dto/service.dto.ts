import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsPositive,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Date when the service was performed',
    example: '2024-01-15',
  })
  @IsNotEmpty()
  @IsDateString()
  serviceDate: string;

  @ApiProperty({
    description: 'Customer identifier',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  customerId: number;

  @ApiProperty({
    description: 'Service amount',
    example: 1500.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

export class ServiceFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['CREATED', 'SENT_TO_BILL', 'INVOICED'],
  })
  @IsOptional()
  @IsEnum(['CREATED', 'SENT_TO_BILL', 'INVOICED'])
  status?: string;

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

export class SendToBillingDto {
  @ApiProperty({
    description: 'Array of service IDs to send to billing',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  serviceIds: number[];
}

export class ServiceResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2024-01-15' })
  serviceDate: Date;

  @ApiProperty({ example: 1 })
  customerId: number;

  @ApiProperty({ example: 1500.5 })
  amount: number;

  @ApiProperty({ example: 'CREATED', enum: ['CREATED', 'SENT_TO_BILL', 'INVOICED'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedServicesResponseDto {
  @ApiProperty({ type: [ServiceResponseDto] })
  data: ServiceResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}
