import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Transaction, TransactionStatus } from './transaction.entity';

@Entity('transaction_history')
export class TransactionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  transaction_id: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'enum', enum: TransactionStatus, nullable: true })
  from_status: TransactionStatus;

  @Column({ type: 'enum', enum: TransactionStatus })
  to_status: TransactionStatus;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;
}
