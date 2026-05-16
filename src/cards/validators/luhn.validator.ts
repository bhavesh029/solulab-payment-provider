import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isLuhnValid', async: false })
export class IsLuhnValidConstraint implements ValidatorConstraintInterface {
  validate(pan: string, args: ValidationArguments) {
    if (!pan || typeof pan !== 'string') return false;
    const sanitized = pan.replace(/\D/g, '');
    if (sanitized.length === 0) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized.charAt(i), 10);

      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid credit card number (failed Luhn check).';
  }
}
