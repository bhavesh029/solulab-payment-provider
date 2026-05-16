import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../transactions/entities/transaction.entity';
import { TransactionHistory } from '../transactions/entities/transaction-history.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CardsService } from '../cards/cards.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    @InjectRepository(TransactionHistory)
    private historyRepo: Repository<TransactionHistory>,
    private cardsService: CardsService,
    @InjectQueue('payments') private paymentsQueue: Queue,
  ) {}

  async createPayment(userId: string, idempotencyKey: string, dto: CreatePaymentDto) {
    const card = await this.cardsService.findByToken(dto.card_token);
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    if (card.user_id !== userId) {
      throw new BadRequestException('Card does not belong to user');
    }

    // Create transaction in INITIATED state
    const transaction = this.transactionsRepo.create({
      user_id: userId,
      card_id: card.id,
      amount: dto.amount,
      currency: dto.currency || 'USD',
      status: TransactionStatus.INITIATED,
      idempotency_key: idempotencyKey,
    });
    
    await this.transactionsRepo.save(transaction);
    
    // Log history
    await this.historyRepo.save({
      transaction_id: transaction.id,
      to_status: TransactionStatus.INITIATED,
      reason: 'Payment requested by user',
    });

    // Add to BullMQ for async processing
    await this.paymentsQueue.add(
      'process-payment',
      { transactionId: transaction.id },
      {
        jobId: idempotencyKey,
        attempts: 4, // 1 initial + 3 retries
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      }
    );

    return {
      transaction_id: transaction.id,
      status: TransactionStatus.PROCESSING,
      message: 'Payment is being processed',
    };
  }
}
