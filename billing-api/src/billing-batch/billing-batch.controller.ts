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
  ApiQuery,
} from '@nestjs/swagger';
import { BillingBatchService } from './billing-batch.service';
import {
  CreateBillingBatchDto,
  BillingBatchFilterDto,
  BillingBatchResponseDto,
  PaginatedBillingBatchResponseDto,
  BatchCreationResultDto,
  BatchStatusResponseDto,
  QueueStatsResponseDto,
} from './dto/billing-batch.dto';

@ApiTags('Billing Batches')
@ApiBearerAuth('access-token')
@Controller('billing-batches')
export class BillingBatchController {
  constructor(private readonly billingBatchService: BillingBatchService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a billing batch (async processing)',
    description: `
      Creates a new billing batch from selected pending items and queues it for asynchronous processing.
      
      The batch is created immediately with status 'PENDING_PROCESSING' and placed in a queue.
      A background worker will process the batch, generating invoices for each valid pending.
      
      Use GET /billing-batches/:id/status to check the processing status.
      
      States:
      - PENDING_PROCESSING: Batch created, waiting in queue
      - IN_PROCESS: Worker is processing the batch
      - PROCESSED: Successfully completed
      - ERROR: Processing failed (can be retried)
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Billing batch created and queued for processing',
    type: BatchCreationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or empty batch' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async create(@Body() createBatchDto: CreateBillingBatchDto): Promise<BatchCreationResultDto> {
    return this.billingBatchService.create(createBatchDto);
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Create a billing batch (synchronous processing)',
    description: `
      Creates a new billing batch and processes it immediately (synchronously).
      This is the legacy behavior - use POST /billing-batches for async processing.
      
      Note: For large batches, prefer the async endpoint to avoid timeouts.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Billing batch created and processed',
    type: BatchCreationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or empty batch' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 500, description: 'Internal server error - Batch processing failed' })
  async createSync(@Body() createBatchDto: CreateBillingBatchDto): Promise<BatchCreationResultDto> {
    return this.billingBatchService.createSync(createBatchDto);
  }

  @Get('queue/stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Returns the current state of the batch processing queue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    type: QueueStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getQueueStats(): Promise<QueueStatsResponseDto> {
    return this.billingBatchService.getQueueStats();
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

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get the processing status of a billing batch',
    description: `
      Returns detailed status information including:
      - Current batch state (PENDING_PROCESSING, IN_PROCESS, PROCESSED, ERROR)
      - Queue job information (if still in queue)
      - Processing progress
      - Error details (if failed)
    `,
  })
  @ApiParam({ name: 'id', description: 'Billing Batch ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Batch status information',
    type: BatchStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Billing batch not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getBatchStatus(@Param('id', ParseIntPipe) id: number): Promise<BatchStatusResponseDto> {
    return this.billingBatchService.getBatchStatus(id);
  }

  @Post(':id/retry')
  @ApiOperation({
    summary: 'Retry a failed batch',
    description: `
      Re-queues a failed batch for processing.
      Only batches with status 'ERROR' can be retried.
      The batch will be reset to 'PENDING_PROCESSING' and added to the queue.
    `,
  })
  @ApiParam({ name: 'id', description: 'Billing Batch ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Batch queued for retry',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Batch 1 has been queued for retry' },
        jobId: { type: 'string', example: 'batch-1-retry-1234567890' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Batch cannot be retried' })
  @ApiResponse({ status: 404, description: 'Billing batch not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async retryBatch(@Param('id', ParseIntPipe) id: number) {
    return this.billingBatchService.retryBatch(id);
  }
}
