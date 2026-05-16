import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionHistory } from './entities/transaction-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, TransactionHistory])],
  exports: [TypeOrmModule],
})
export class TransactionsModule {}
