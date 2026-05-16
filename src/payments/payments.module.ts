import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentProcessor } from './processors/payment.processor';
import { TransactionsModule } from '../transactions/transactions.module';
import { CardsModule } from '../cards/cards.module';
import { BankMockModule } from '../bank-mock/bank-mock.module';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TransactionsModule,
    CardsModule,
    BankMockModule,
    ConfigModule,
    BullModule.registerQueue({
      name: 'payments',
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProcessor, IdempotencyInterceptor],
})
export class PaymentsModule {}
