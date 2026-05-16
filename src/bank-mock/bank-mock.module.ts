import { Module } from '@nestjs/common';
import { BankMockService } from './bank-mock.service';

@Module({
  providers: [BankMockService],
  exports: [BankMockService],
})
export class BankMockModule {}
