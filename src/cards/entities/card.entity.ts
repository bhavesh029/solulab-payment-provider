import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  last4: string;

  @Column()
  exp_month: number;

  @Column()
  exp_year: number;

  @Index()
  @Column({ unique: true })
  token: string;

  @Column()
  encrypted_pan: string;

  @CreateDateColumn()
  created_at: Date;
}
