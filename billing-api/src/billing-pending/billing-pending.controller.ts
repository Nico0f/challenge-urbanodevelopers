import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BillingPendingService } from './billing-pending.service';
import {
  BillingPendingFilterDto,
  BillingPendingResponseDto,
  PaginatedBillingPendingResponseDto,
  BillingPendingSummaryDto,
} from './dto/billing-pending.dto';

@ApiTags('Billing Pendings')
@ApiBearerAuth('access-token')
@Controller('billing-pendings')
export class BillingPendingController {
  constructor(private readonly billingPendingService: BillingPendingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all billing pendings with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of billing pendings',
    type: PaginatedBillingPendingResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findAll(@Query() filterDto: BillingPendingFilterDto) {
    return this.billingPendingService.findAll(filterDto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get summary of pending items for billing' })
  @ApiResponse({
    status: 200,
    description: 'Summary of pending items',
    type: BillingPendingSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getSummary() {
    return this.billingPendingService.getSummary();
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available (PENDING status) items for billing' })
  @ApiResponse({
    status: 200,
    description: 'List of available pending items',
    type: [BillingPendingResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findAvailable() {
    return this.billingPendingService.findPendingItems();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a billing pending by ID' })
  @ApiParam({ name: 'id', description: 'Billing Pending ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Billing pending found',
    type: BillingPendingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Billing pending not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billingPendingService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a billing pending (revert to CREATED status)' })
  @ApiParam({ name: 'id', description: 'Billing Pending ID', type: Number })
  @ApiResponse({ status: 204, description: 'Billing pending cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Pending cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Billing pending not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.billingPendingService.cancel(id);
  }
}
