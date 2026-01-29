import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ErpSyncService } from './erp-sync.service';
import {
  SyncInvoicesDto,
  SyncBatchDto,
  ErpSyncResponseDto,
  ErpSyncHistoryFilterDto,
  ErpSyncHistoryItemDto,
  ErpInvoiceDataDto,
} from './dto/erp-sync.dto';

@ApiTags('ERP Sync')
@ApiBearerAuth('access-token')
@Controller('erp-sync')
export class ErpSyncController {
  constructor(private readonly erpSyncService: ErpSyncService) {}

  @Post('invoices')
  @ApiOperation({
    summary: 'Sync selected invoices to ERP system (simulated)',
    description: `
      Transforms invoice data to ERP format and simulates sending to external accounting system.
      The data includes:
      - Invoice details (number, CAE, dates, amounts)
      - Customer information
      - Accounting entries (debit/credit)
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Sync operation completed',
    type: ErpSyncResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Invoices not found' })
  async syncInvoices(@Body() syncDto: SyncInvoicesDto): Promise<ErpSyncResponseDto> {
    return this.erpSyncService.syncInvoices(syncDto.invoiceIds);
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Sync all invoices from a billing batch to ERP system (simulated)',
    description: 'Syncs all invoices belonging to a specific billing batch.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sync operation completed',
    type: ErpSyncResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async syncBatch(@Body() syncDto: SyncBatchDto): Promise<ErpSyncResponseDto> {
    return this.erpSyncService.syncBatch(syncDto.batchId);
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Preview the data that would be sent to ERP',
    description: 'Returns the transformed data without actually sending it to the ERP.',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview data',
    type: [ErpInvoiceDataDto],
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Invoices not found' })
  async previewSync(@Body() syncDto: SyncInvoicesDto): Promise<ErpInvoiceDataDto[]> {
    return this.erpSyncService.previewSync(syncDto.invoiceIds);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get ERP sync history with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Sync history',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ErpSyncHistoryItemDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getSyncHistory(@Query() filterDto: ErpSyncHistoryFilterDto) {
    return this.erpSyncService.getSyncHistory(
      filterDto.page,
      filterDto.limit,
      filterDto.status,
      filterDto.dateFrom,
      filterDto.dateTo,
    );
  }

  @Get('history/:syncId')
  @ApiOperation({ summary: 'Get details of a specific sync operation' })
  @ApiParam({ name: 'syncId', description: 'Sync ID', example: 'SYNC-2024-000001' })
  @ApiResponse({
    status: 200,
    description: 'Sync details',
    type: ErpSyncResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Sync not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getSyncDetail(@Param('syncId') syncId: string): Promise<ErpSyncResponseDto> {
    return this.erpSyncService.getSyncDetail(syncId);
  }

  @Post('confirm/:syncId')
  @ApiOperation({
    summary: 'Confirm a sync operation (mark as confirmed in ERP)',
    description: 'Marks a previously sent sync as confirmed by the ERP system.',
  })
  @ApiParam({ name: 'syncId', description: 'Sync ID', example: 'SYNC-2024-000001' })
  @ApiResponse({
    status: 200,
    description: 'Sync confirmed',
    schema: {
      properties: {
        syncId: { type: 'string' },
        status: { type: 'string', enum: ['CONFIRMED'] },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Sync cannot be confirmed' })
  @ApiResponse({ status: 404, description: 'Sync not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async confirmSync(@Param('syncId') syncId: string) {
    return this.erpSyncService.confirmSync(syncId);
  }
}
