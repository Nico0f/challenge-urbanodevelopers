import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Service } from './service.entity';
import { Invoice } from './invoice.entity';

export enum PendingStatus {
  PENDING = 'PENDING',
  INVOICED = 'INVOICED',
}

@Entity('billing_pendings')
export class BillingPending {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  serviceId: number;

  @ManyToOne(() => Service, (service) => service.pendings)
  @JoinColumn({ name: 'serviceId' })
  service: Service;

  @Column({
    type: 'enum',
    enum: PendingStatus,
    default: PendingStatus.PENDING,
  })
  status: PendingStatus;

  @OneToMany(() => Invoice, (invoice) => invoice.pending)
  invoices: Invoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

