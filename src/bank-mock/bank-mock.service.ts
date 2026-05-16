import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface BankPaymentRequest {
  amount: number;
  currency: string;
  pan: string;
  exp_month: number;
  exp_year: number;
}

export interface BankPaymentResponse {
  success: boolean;
  bank_transaction_id: string;
  authorization_code?: string;
  error_code?: string;
  message?: string;
}

@Injectable()
export class BankMockService {
  private readonly logger = new Logger(BankMockService.name);

  async processPayment(request: BankPaymentRequest): Promise<BankPaymentResponse> {
    // Simulate variable latency (100ms - 3000ms)
    const delay = Math.floor(Math.random() * 2900) + 100;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Determine outcome based on probabilities
    const rand = Math.random() * 100; // 0 to 100
    const bankTxId = uuidv4();

    if (rand < 5) {
      // 5% Insufficient funds
      return { success: false, bank_transaction_id: bankTxId, error_code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' };
    } else if (rand < 8) {
      // 3% Declined by issuer
      return { success: false, bank_transaction_id: bankTxId, error_code: 'DECLINED_BY_ISSUER', message: 'Declined by issuer' };
    } else if (rand < 10) {
      // 2% Invalid card
      return { success: false, bank_transaction_id: bankTxId, error_code: 'INVALID_CARD', message: 'Invalid card number' };
    } else if (rand < 12) {
      // 2% Card expired
      return { success: false, bank_transaction_id: bankTxId, error_code: 'CARD_EXPIRED', message: 'Card has expired' };
    } else if (rand < 14) {
      // 2% Network timeout
      return { success: false, bank_transaction_id: bankTxId, error_code: 'NETWORK_TIMEOUT', message: 'Bank network timeout' };
    } else if (rand < 15) {
      // 1% Rate limit exceeded
      return { success: false, bank_transaction_id: bankTxId, error_code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded at bank' };
    } else {
      // 85% Success
      return { success: true, bank_transaction_id: bankTxId, authorization_code: `AUTH-${uuidv4().substring(0, 8).toUpperCase()}` };
    }
  }
}
