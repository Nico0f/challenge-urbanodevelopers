import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { BillingBatch } from '../entities/billing-batch.entity';
import {
  ErpSyncStatus,
  ErpInvoiceDataDto,
  ErpSyncResponseDto,
  ErpSyncHistoryItemDto,
} from './dto/erp-sync.dto';
import { EntityNotFoundException, ErpSyncException } from '../common';

// In-memory storage for sync history (in production, this would be a database table)
interface SyncHistoryEntry {
  syncId: string;
  status: ErpSyncStatus;
  timestamp: Date;
  invoiceIds: number[];
  totalAmount: number;
  errorMessage?: string;
}

@Injectable()
export class ErpSyncService {
  private readonly logger = new Logger(ErpSyncService.name);
  private syncHistory: SyncHistoryEntry[] = [];
  private syncCounter = 0;

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(BillingBatch)
    private readonly batchRepository: Repository<BillingBatch>,
  ) {}

  async syncInvoices(invoiceIds: number[]): Promise<ErpSyncResponseDto> {
    this.logger.log(`Starting ERP sync for invoices: ${invoiceIds.join(', ')}`);

    const invoices = await this.invoiceRepository.find({
      where: { id: In(invoiceIds) },
      relations: ['batch', 'pending', 'pending.service'],
    });

    if (invoices.length === 0) {
      throw new EntityNotFoundException('Invoices', invoiceIds.join(', '));
    }

    // Transform invoices to ERP format
    const erpData = this.transformToErpFormat(invoices);

    // Simulate ERP sync (in production, this would be an API call)
    const syncResult = await this.simulateErpSync(erpData);

    // Store in history
    const syncId = this.generateSyncId();
    const totalAmount = erpData.reduce((sum, inv) => sum + inv.amount, 0);

    this.syncHistory.push({
      syncId,
      status: syncResult.success ? ErpSyncStatus.SENT : ErpSyncStatus.ERROR,
      timestamp: new Date(),
      invoiceIds,
      totalAmount,
      errorMessage: syncResult.success ? undefined : syncResult.error,
    });

    this.logger.log(
      `ERP sync completed: ${syncResult.success ? 'SUCCESS' : 'ERROR'} - ${syncId}`,
    );

    return {
      syncId,
      status: syncResult.success ? ErpSyncStatus.SENT : ErpSyncStatus.ERROR,
      timestamp: new Date().toISOString(),
      data: erpData,
      summary: {
        totalInvoices: erpData.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        success: syncResult.success,
        message: syncResult.success
          ? 'Data successfully sent to ERP system'
          : `Sync failed: ${syncResult.error}`,
      },
    };
  }

  async syncBatch(batchId: number): Promise<ErpSyncResponseDto> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
      relations: ['invoices'],
    });

    if (!batch) {
      throw new EntityNotFoundException('BillingBatch', batchId);
    }

    if (!batch.invoices || batch.invoices.length === 0) {
      throw new ErpSyncException('Batch has no invoices to sync');
    }

    const invoiceIds = batch.invoices.map((inv) => inv.id);
    return this.syncInvoices(invoiceIds);
  }

  async getSyncHistory(
    page: number = 1,
    limit: number = 10,
    status?: ErpSyncStatus,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    data: ErpSyncHistoryItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let filtered = [...this.syncHistory];

    if (status) {
      filtered = filtered.filter((h) => h.status === status);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((h) => h.timestamp >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((h) => h.timestamp <= to);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map((h) => ({
      syncId: h.syncId,
      status: h.status,
      timestamp: h.timestamp.toISOString(),
      invoiceCount: h.invoiceIds.length,
      totalAmount: Math.round(h.totalAmount * 100) / 100,
      errorMessage: h.errorMessage,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getSyncDetail(syncId: string): Promise<ErpSyncResponseDto> {
    const historyEntry = this.syncHistory.find((h) => h.syncId === syncId);

    if (!historyEntry) {
      throw new EntityNotFoundException('SyncHistory', syncId);
    }

    const invoices = await this.invoiceRepository.find({
      where: { id: In(historyEntry.invoiceIds) },
      relations: ['batch', 'pending', 'pending.service'],
    });

    const erpData = this.transformToErpFormat(invoices);

    return {
      syncId: historyEntry.syncId,
      status: historyEntry.status,
      timestamp: historyEntry.timestamp.toISOString(),
      data: erpData,
      summary: {
        totalInvoices: invoices.length,
        totalAmount: historyEntry.totalAmount,
        success: historyEntry.status !== ErpSyncStatus.ERROR,
        message:
          historyEntry.status === ErpSyncStatus.ERROR
            ? historyEntry.errorMessage || 'Sync failed'
            : 'Data successfully sent to ERP system',
      },
    };
  }

  async confirmSync(syncId: string): Promise<{ syncId: string; status: ErpSyncStatus }> {
    const historyEntry = this.syncHistory.find((h) => h.syncId === syncId);

    if (!historyEntry) {
      throw new EntityNotFoundException('SyncHistory', syncId);
    }

    if (historyEntry.status !== ErpSyncStatus.SENT) {
      throw new ErpSyncException(
        `Cannot confirm sync with status '${historyEntry.status}'. Only 'SENT' syncs can be confirmed.`,
      );
    }

    historyEntry.status = ErpSyncStatus.CONFIRMED;
    this.logger.log(`Sync ${syncId} confirmed`);

    return {
      syncId,
      status: ErpSyncStatus.CONFIRMED,
    };
  }

  private transformToErpFormat(invoices: Invoice[]): ErpInvoiceDataDto[] {
    return invoices.map((invoice) => {
      const service = invoice.pending?.service;
      const amount = Number(invoice.amount);

      return {
        invoiceNumber: invoice.invoiceNumber,
        cae: invoice.cae,
        issueDate: new Date(invoice.issueDate).toISOString().split('T')[0],
        amount,
        customerId: service?.customerId || 0,
        serviceDate: service
          ? new Date(service.serviceDate).toISOString().split('T')[0]
          : '',
        receiptBook: invoice.batch?.receiptBook || '',
        batchId: invoice.batchId,
        // Simulated accounting entries
        accountingEntries: [
          {
            accountCode: '1.1.3.01',
            accountName: 'Cuentas por Cobrar',
            debit: amount,
            credit: 0,
          },
          {
            accountCode: '4.1.1.01',
            accountName: 'Ventas de Servicios',
            debit: 0,
            credit: Math.round(amount / 1.21 * 100) / 100, // Net amount (assuming 21% VAT)
          },
          {
            accountCode: '2.1.5.01',
            accountName: 'IVA Débito Fiscal',
            debit: 0,
            credit: Math.round((amount - amount / 1.21) * 100) / 100, // VAT amount
          },
        ],
      };
    });
  }

  private async simulateErpSync(
    data: ErpInvoiceDataDto[],
  ): Promise<{ success: boolean; error?: string }> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate random success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (!success) {
      return {
        success: false,
        error: 'Simulated ERP connection timeout',
      };
    }

    this.logger.log(`Simulated ERP received ${data.length} invoices`);
    return { success: true };
  }

  private generateSyncId(): string {
    this.syncCounter++;
    const year = new Date().getFullYear();
    const counter = String(this.syncCounter).padStart(6, '0');
    return `SYNC-${year}-${counter}`;
  }

  // Method to get preview of data that would be sent to ERP
  async previewSync(invoiceIds: number[]): Promise<ErpInvoiceDataDto[]> {
    const invoices = await this.invoiceRepository.find({
      where: { id: In(invoiceIds) },
      relations: ['batch', 'pending', 'pending.service'],
    });

    if (invoices.length === 0) {
      throw new EntityNotFoundException('Invoices', invoiceIds.join(', '));
    }

    return this.transformToErpFormat(invoices);
  }
}
