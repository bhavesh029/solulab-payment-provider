import { Controller, Post, Body, UseGuards, Request, Headers, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(IdempotencyInterceptor)
  createPayment(
    @Request() req: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(req.user.userId, idempotencyKey, dto);
  }
}
