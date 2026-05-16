import { IsLuhnValidConstraint } from './luhn.validator';
import { ValidationArguments } from 'class-validator';

describe('IsLuhnValidConstraint', () => {
  let validator: IsLuhnValidConstraint;

  beforeEach(() => {
    validator = new IsLuhnValidConstraint();
  });

  it('should return true for valid Luhn numbers', () => {
    expect(validator.validate('4242424242424242', {} as ValidationArguments)).toBe(true);
    expect(validator.validate('4111111111111111', {} as ValidationArguments)).toBe(true);
  });

  it('should return false for invalid Luhn numbers', () => {
    expect(validator.validate('4242424242424243', {} as ValidationArguments)).toBe(false);
  });

  it('should return false for non-string or empty inputs', () => {
    expect(validator.validate('', {} as ValidationArguments)).toBe(false);
    expect(validator.validate(null as any, {} as ValidationArguments)).toBe(false);
  });
});
