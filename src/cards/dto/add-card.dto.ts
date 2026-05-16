import { IsString, IsNotEmpty, IsNumber, Min, Max, Validate } from 'class-validator';
import { IsLuhnValidConstraint } from '../validators/luhn.validator';

export class AddCardDto {
  @IsString()
  @IsNotEmpty()
  @Validate(IsLuhnValidConstraint)
  pan: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  exp_month: number;

  @IsNumber()
  @Min(new Date().getFullYear())
  exp_year: number;
}
