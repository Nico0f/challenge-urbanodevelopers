import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BillingBatchService } from './billing-batch.service';
import {
  CreateBillingBatchDto,
  BillingBatchFilterDto,
  BillingBatchResponseDto,
  PaginatedBillingBatchResponseDto,
  BatchCreationResultDto,
} from './dto/billing-batch.dto';

@ApiTags('Billing Batches')
@ApiBearerAuth('access-token')
@Controller('billing-batches')
export class BillingBatchController {
  constructor(private readonly billingBatchService: BillingBatchService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a billing batch (manual batch invoicing process)',
    description: `
      Creates a new billing batch from selected pending items.
      This is a manual process that:
      - Groups selected pendings into a batch
      - Generates sequential invoice numbers within the receipt book
      - Generates simulated CAE for each invoice
      - All invoices share the same issue date
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Billing batch created successfully',
    type: BatchCreationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or empty batch' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 500, description: 'Internal server error - Batch processing failed' })
  async create(@Body() createBatchDto: CreateBillingBatchDto): Promise<BatchCreationResultDto> {
    return this.billingBatchService.create(createBatchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all billing batches with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of billing batches',
    type: PaginatedBillingBatchResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findAll(@Query() filterDto: BillingBatchFilterDto) {
    return this.billingBatchService.findAll(filterDto);
  }

  @Get('receipt-books')
  @ApiOperation({ summary: 'Get list of all used receipt books' })
  @ApiResponse({
    status: 200,
    description: 'List of receipt book identifiers',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['A-0001', 'A-0002', 'B-0001'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getReceiptBooks(): Promise<string[]> {
    return this.billingBatchService.getReceiptBooks();
  }

  @Get('next-invoice-number/:receiptBook')
  @ApiOperation({ summary: 'Get the next invoice number for a receipt book' })
  @ApiParam({
    name: 'receiptBook',
    description: 'Receipt book identifier',
    example: 'A-0001',
  })
  @ApiResponse({
    status: 200,
    description: 'Next invoice number',
    schema: {
      type: 'object',
      properties: {
        receiptBook: { type: 'string', example: 'A-0001' },
        nextNumber: { type: 'string', example: 'A-0001-00000001' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getNextInvoiceNumber(@Param('receiptBook') receiptBook: string) {
    const nextNumber = await this.billingBatchService.getNextInvoiceNumber(receiptBook);
    return { receiptBook, nextNumber };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a billing batch by ID with all invoices' })
  @ApiParam({ name: 'id', description: 'Billing Batch ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Billing batch found',
    type: BillingBatchResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Billing batch not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billingBatchService.findOne(id);
  }
}
