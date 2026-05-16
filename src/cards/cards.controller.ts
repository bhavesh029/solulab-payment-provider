import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CardsService } from './cards.service';
import { AddCardDto } from './dto/add-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  addCard(@Request() req: any, @Body() addCardDto: AddCardDto) {
    return this.cardsService.addCard(req.user.userId, addCardDto);
  }
}
