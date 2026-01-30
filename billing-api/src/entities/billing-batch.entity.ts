import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Invoice } from './invoice.entity';

export enum BatchStatus {
  PENDING_PROCESSING = 'PENDING_PROCESSING',
  IN_PROCESS = 'IN_PROCESS',
  PROCESSED = 'PROCESSED',
  ERROR = 'ERROR',
}

@Entity('billing_batches')
export class BillingBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column()
  receiptBook: string;

  @Column({
    type: 'enum',
    enum: BatchStatus,
    default: BatchStatus.PENDING_PROCESSING,
  })
  status: BatchStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'simple-array', nullable: true })
  pendingIds: number[];

  @Column({ type: 'timestamp', nullable: true })
  processingStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processingCompletedAt: Date;

  @Column({ type: 'int', default: 0 })
  totalInvoices: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @OneToMany(() => Invoice, (invoice) => invoice.batch)
  invoices: Invoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
