import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProcessor } from './payment.processor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { TransactionHistory } from '../../transactions/entities/transaction-history.entity';
import { BankMockService } from '../../bank-mock/bank-mock.service';
import { CardsService } from '../../cards/cards.service';
import { Job } from 'bullmq';

describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;
  let transactionsRepo: any;
  let historyRepo: any;
  let bankMockService: any;
  let cardsService: any;

  beforeEach(async () => {
    transactionsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    historyRepo = {
      save: jest.fn(),
    };
    bankMockService = {
      processPayment: jest.fn(),
    };
    cardsService = {
      decryptPan: jest.fn().mockReturnValue('4242424242424242'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProcessor,
        { provide: getRepositoryToken(Transaction), useValue: transactionsRepo },
        { provide: getRepositoryToken(TransactionHistory), useValue: historyRepo },
        { provide: BankMockService, useValue: bankMockService },
        { provide: CardsService, useValue: cardsService },
      ],
    }).compile();

    processor = module.get<PaymentProcessor>(PaymentProcessor);
  });

  it('should process a successful payment and update status to CAPTURED', async () => {
    const mockTransaction = {
      id: 'txn-1',
      status: TransactionStatus.INITIATED,
      amount: 100,
      currency: 'USD',
      card: { encrypted_pan: 'enc', exp_month: 12, exp_year: 2025 },
    };
    transactionsRepo.findOne.mockResolvedValue(mockTransaction);
    bankMockService.processPayment.mockResolvedValue({
      success: true,
      bank_transaction_id: 'bank-1',
      authorization_code: 'AUTH-123',
    });

    const job = { data: { transactionId: 'txn-1' }, attemptsMade: 0 } as Job;
    await processor.process(job);

    expect(transactionsRepo.save).toHaveBeenCalled();
    expect(mockTransaction.status).toBe(TransactionStatus.CAPTURED);
    expect(mockTransaction.authorization_code).toBe('AUTH-123');
  });

  it('should throw error for transient bank failures to trigger BullMQ retry', async () => {
    const mockTransaction = {
      id: 'txn-2',
      status: TransactionStatus.INITIATED,
      amount: 100,
      currency: 'USD',
      card: { encrypted_pan: 'enc', exp_month: 12, exp_year: 2025 },
    };
    transactionsRepo.findOne.mockResolvedValue(mockTransaction);
    bankMockService.processPayment.mockResolvedValue({
      success: false,
      bank_transaction_id: 'bank-2',
      error_code: 'NETWORK_TIMEOUT',
    });

    const job = { data: { transactionId: 'txn-2' }, attemptsMade: 1 } as Job;
    
    await expect(processor.process(job)).rejects.toThrow('Transient error: NETWORK_TIMEOUT');
    expect(mockTransaction.status).toBe(TransactionStatus.RETRYING);
    expect(mockTransaction.retry_count).toBe(2);
  });

  it('should mark as FAILED for permanent bank failures', async () => {
    const mockTransaction = {
      id: 'txn-3',
      status: TransactionStatus.INITIATED,
      amount: 100,
      currency: 'USD',
      card: { encrypted_pan: 'enc', exp_month: 12, exp_year: 2025 },
    };
    transactionsRepo.findOne.mockResolvedValue(mockTransaction);
    bankMockService.processPayment.mockResolvedValue({
      success: false,
      bank_transaction_id: 'bank-3',
      error_code: 'INSUFFICIENT_FUNDS',
    });

    const job = { data: { transactionId: 'txn-3' }, attemptsMade: 0 } as Job;
    await processor.process(job);

    expect(mockTransaction.status).toBe(TransactionStatus.FAILED);
  });
});
