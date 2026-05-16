import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
      throw new HttpException('Idempotency-Key header is required', HttpStatus.BAD_REQUEST);
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const cachedResponse = await this.redis.get(cacheKey);

    if (cachedResponse) {
      return of(JSON.parse(cachedResponse));
    }

    // Set an initial flag to prevent race conditions during long processing
    const isSet = await this.redis.set(cacheKey, JSON.stringify({ status: 'PROCESSING' }), 'EX', 86400, 'NX');
    if (!isSet) {
      throw new HttpException('Request with this Idempotency-Key is already being processed', HttpStatus.CONFLICT);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.redis.set(cacheKey, JSON.stringify(response), 'EX', 86400); // 24 hours expiry
      }),
    );
  }
}
