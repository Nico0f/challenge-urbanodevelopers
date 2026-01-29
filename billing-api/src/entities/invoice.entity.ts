import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BillingBatch } from './billing-batch.entity';
import { BillingPending } from './billing-pending.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  invoiceNumber: string;

  @Column()
  cae: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  batchId: number;

  @ManyToOne(() => BillingBatch, (batch) => batch.invoices)
  @JoinColumn({ name: 'batchId' })
  batch: BillingBatch;

  @Column()
  pendingId: number;

  @ManyToOne(() => BillingPending, (pending) => pending.invoices)
  @JoinColumn({ name: 'pendingId' })
  pending: BillingPending;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

