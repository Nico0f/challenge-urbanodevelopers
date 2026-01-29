import {
  Controller,
  Get,
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
import { InvoicesService } from './invoices.service';
import {
  InvoiceFilterDto,
  InvoiceResponseDto,
  PaginatedInvoicesResponseDto,
  InvoiceStatisticsDto,
} from './dto/invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all invoices with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of invoices',
    type: PaginatedInvoicesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findAll(@Query() filterDto: InvoiceFilterDto) {
    return this.invoicesService.findAll(filterDto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get invoice statistics' })
  @ApiResponse({
    status: 200,
    description: 'Invoice statistics',
    type: InvoiceStatisticsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getStatistics() {
    return this.invoicesService.getStatistics();
  }

  @Get('by-customer/:customerId')
  @ApiOperation({ summary: 'Get all invoices for a specific customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of invoices for the customer',
    type: [InvoiceResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.invoicesService.findByCustomer(customerId);
  }

  @Get('by-batch/:batchId')
  @ApiOperation({ summary: 'Get all invoices for a specific batch' })
  @ApiParam({ name: 'batchId', description: 'Batch ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of invoices in the batch',
    type: [InvoiceResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findByBatch(@Param('batchId', ParseIntPipe) batchId: number) {
    return this.invoicesService.findByBatch(batchId);
  }

  @Get('number/:invoiceNumber')
  @ApiOperation({ summary: 'Get an invoice by invoice number' })
  @ApiParam({
    name: 'invoiceNumber',
    description: 'Invoice number',
    example: 'A-0001-00000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findByInvoiceNumber(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoicesService.findByInvoiceNumber(invoiceNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }
}
