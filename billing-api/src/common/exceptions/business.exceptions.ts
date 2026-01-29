import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        error: 'BusinessError',
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class EntityNotFoundException extends HttpException {
  constructor(entity: string, identifier: string | number) {
    super(
      {
        message: `${entity} with identifier '${identifier}' not found`,
        error: 'NotFound',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateEntityException extends HttpException {
  constructor(entity: string, field: string, value: any) {
    super(
      {
        message: `${entity} with ${field} '${value}' already exists`,
        error: 'DuplicateEntry',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidStateTransitionException extends HttpException {
  constructor(entity: string, currentState: string, targetState: string) {
    super(
      {
        message: `Cannot transition ${entity} from '${currentState}' to '${targetState}'`,
        error: 'InvalidStateTransition',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ServiceAlreadyBilledException extends HttpException {
  constructor(serviceId: number) {
    super(
      {
        message: `Service ${serviceId} has already been sent to billing`,
        error: 'ServiceAlreadyBilled',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class PendingAlreadyInvoicedException extends HttpException {
  constructor(pendingId: number) {
    super(
      {
        message: `Billing pending ${pendingId} has already been invoiced`,
        error: 'PendingAlreadyInvoiced',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class EmptyBatchException extends HttpException {
  constructor() {
    super(
      {
        message: 'Cannot create a billing batch without any pending items',
        error: 'EmptyBatch',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class BatchProcessingException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        error: 'BatchProcessingError',
        details,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class ErpSyncException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        error: 'ErpSyncError',
        details,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
