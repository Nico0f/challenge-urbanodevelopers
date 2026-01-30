export interface Service {
  id: number;
  serviceDate: string;
  customerId: number;
  amount: number;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export type ServiceStatus = 'CREATED' | 'SENT_TO_BILL' | 'INVOICED';

export interface BillingPending {
  id: number;
  serviceId: number;
  status: PendingStatus;
  service?: Service;
  createdAt: string;
  updatedAt: string;
}

export type PendingStatus = 'PENDING' | 'INVOICED';

export interface BillingBatch {
  id: number;
  issueDate: string;
  receiptBook: string;
  status: BatchStatus;
  errorMessage?: string;
  invoices?: Invoice[];
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'PROCESSED' | 'ERROR';

export interface Invoice {
  id: number;
  invoiceNumber: string;
  cae: string;
  issueDate: string;
  amount: number;
  batchId: number;
  pendingId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BillingPendingSummary {
  totalPending: number;
  totalAmount: number;
  byCustomer: {
    customerId: number;
    count: number;
    totalAmount: number;
  }[];
}

export interface BatchCreationResult {
  batch: BillingBatch;
  invoices: Invoice[];
  summary: {
    totalInvoices: number;
    totalAmount: number;
    successfulPendings: number[];
    failedPendings: { id: number; reason: string }[];
  };
}

export interface CreateBatchDto {
  issueDate: string;
  receiptBook: string;
  pendingIds: number[];
}

export interface Filters {
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
