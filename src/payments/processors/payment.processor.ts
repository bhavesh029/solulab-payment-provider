import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { TransactionHistory } from '../../transactions/entities/transaction-history.entity';
import { BankMockService } from '../../bank-mock/bank-mock.service';
import { CardsService } from '../../cards/cards.service';

@Injectable()
@Processor('payments')
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    @InjectRepository(TransactionHistory)
    private historyRepo: Repository<TransactionHistory>,
    private bankMockService: BankMockService,
    private cardsService: CardsService,
  ) {
    super();
  }

  async process(job: Job<{ transactionId: string }>) {
    const { transactionId } = job.data;
    const transaction = await this.transactionsRepo.findOne({
      where: { id: transactionId },
      relations: ['card'],
    });

    if (!transaction) {
      this.logger.error(`Transaction ${transactionId} not found`);
      return;
    }

    if (transaction.status === TransactionStatus.INITIATED) {
      await this.updateStatus(transaction, TransactionStatus.PROCESSING, 'Started processing payment');
    } else if (transaction.status === TransactionStatus.FAILED) {
      this.logger.warn(`Transaction ${transactionId} already failed, skipping`);
      return;
    }

    try {
      const decryptedPan = this.cardsService.decryptPan(transaction.card.encrypted_pan);
      const bankResponse = await this.bankMockService.processPayment({
        amount: transaction.amount,
        currency: transaction.currency,
        pan: decryptedPan,
        exp_month: transaction.card.exp_month,
        exp_year: transaction.card.exp_year,
      });

      transaction.bank_transaction_id = bankResponse.bank_transaction_id;

      if (bankResponse.success) {
        transaction.authorization_code = bankResponse.authorization_code || '';
        // The assignment flow says AUTHORIZED -> CAPTURED
        await this.updateStatus(transaction, TransactionStatus.AUTHORIZED, 'Bank authorized payment');
        await this.updateStatus(transaction, TransactionStatus.CAPTURED, 'Payment successfully captured');
      } else {
        transaction.error_code = bankResponse.error_code || 'UNKNOWN';
        const transientErrors = ['NETWORK_TIMEOUT', 'RATE_LIMIT_EXCEEDED']; // Simulation 5xx
        
        if (transientErrors.includes(transaction.error_code)) {
          // If transient error and we still have retries left (attempts < 4 meaning 0,1,2 retries)
          if (job.attemptsMade < 3) {
            transaction.retry_count = job.attemptsMade + 1;
            await this.updateStatus(transaction, TransactionStatus.RETRYING, `Transient error: ${bankResponse.error_code}`);
            throw new Error(`Transient error: ${bankResponse.error_code}`); // Throws to BullMQ to trigger retry
          } else {
            await this.updateStatus(transaction, TransactionStatus.FAILED, `Failed after 3 retries: ${bankResponse.error_code}`);
          }
        } else {
          // Permanent failure
          await this.updateStatus(transaction, TransactionStatus.FAILED, `Permanent error: ${bankResponse.error_code}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing payment ${transactionId}`, error.stack);
      // If the error was thrown by us for transient failure, we rethrow so BullMQ handles backoff
      if (error.message.startsWith('Transient error')) {
        throw error;
      } else {
        // Unexpected system error, fail transaction
        await this.updateStatus(transaction, TransactionStatus.FAILED, `System error: ${error.message}`);
      }
    }
  }

  private async updateStatus(transaction: Transaction, toStatus: TransactionStatus, reason: string) {
    const fromStatus = transaction.status;
    transaction.status = toStatus;
    await this.transactionsRepo.save(transaction);
    
    await this.historyRepo.save({
      transaction_id: transaction.id,
      from_status: fromStatus,
      to_status: toStatus,
      reason,
    });
    
    this.logger.log(`Transaction ${transaction.id} transitioned from ${fromStatus} to ${toStatus}. Reason: ${reason}`);
  }
}
