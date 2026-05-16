import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import { ConfigService } from '@nestjs/config';
import { AddCardDto } from './dto/add-card.dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class CardsService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(
    @InjectRepository(Card)
    private cardsRepository: Repository<Card>,
    private configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('ENCRYPTION_KEY', 'default-32-byte-secret-key-123456');
    // Ensure key is 32 bytes
    this.key = crypto.scryptSync(secret, 'salt', 32);
  }

  async addCard(userId: string, dto: AddCardDto): Promise<{ token: string; last4: string }> {
    const sanitizedPan = dto.pan.replace(/\D/g, '');
    const last4 = sanitizedPan.slice(-4);
    
    // Encrypt PAN
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(sanitizedPan, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    const encryptedPan = `${iv.toString('hex')}:${authTag}:${encrypted}`;
    const token = uuidv4();

    const card = this.cardsRepository.create({
      user_id: userId,
      last4,
      exp_month: dto.exp_month,
      exp_year: dto.exp_year,
      token,
      encrypted_pan: encryptedPan,
    });

    await this.cardsRepository.save(card);
    
    return { token, last4 };
  }

  async findByToken(token: string): Promise<Card | null> {
    return this.cardsRepository.findOne({ where: { token } });
  }

  decryptPan(encryptedPan: string): string {
    const [ivHex, authTagHex, encryptedHex] = encryptedPan.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }
}
