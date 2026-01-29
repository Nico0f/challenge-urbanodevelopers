import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
  ApiQuery,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceFilterDto,
  SendToBillingDto,
  ServiceResponseDto,
  PaginatedServicesResponseDto,
} from './dto/service.dto';

@ApiTags('Services')
@ApiBearerAuth('access-token')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new logistics service' })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of services',
    type: PaginatedServicesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findAll(@Query() filterDto: ServiceFilterDto) {
    return this.servicesService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Service found',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiParam({ name: 'id', description: 'Service ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Service cannot be updated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiParam({ name: 'id', description: 'Service ID', type: Number })
  @ApiResponse({ status: 204, description: 'Service deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Service cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.remove(id);
  }

  @Post('send-to-billing')
  @ApiOperation({ summary: 'Send services to billing (creates billing pendings)' })
  @ApiResponse({
    status: 201,
    description: 'Services sent to billing',
    schema: {
      properties: {
        success: { type: 'array', items: { type: 'number' }, example: [1, 2] },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              reason: { type: 'string' },
            },
          },
          example: [{ id: 3, reason: 'Service already has a billing pending' }],
        },
        pendings: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async sendToBilling(@Body() sendToBillingDto: SendToBillingDto) {
    return this.servicesService.sendToBilling(sendToBillingDto);
  }
}
