import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BillingPending } from './billing-pending.entity';

export enum ServiceStatus {
  CREATED = 'CREATED',
  SENT_TO_BILL = 'SENT_TO_BILL',
  INVOICED = 'INVOICED',
}

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  serviceDate: Date;

  @Column()
  customerId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.CREATED,
  })
  status: ServiceStatus;

  @OneToMany(() => BillingPending, (pending) => pending.service)
  pendings: BillingPending[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

