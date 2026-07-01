export class Money {
  readonly centsValue: bigint;
  readonly currency: string;
  readonly precision: number;

  constructor(amount: number | string | bigint, currency = 'EGP', precision = 2) {
    this.currency = currency.toUpperCase();
    this.precision = precision;

    if (typeof amount === 'bigint') {
      this.centsValue = amount;
    } else {
      const multiplier = Math.pow(10, precision);
      const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      this.centsValue = BigInt(Math.round(parsedAmount * multiplier));
    }
  }

  static zero(currency = 'EGP', precision = 2): Money {
    return new Money(BigInt(0), currency, precision);
  }

  static fromJSON(json: { amount: string; currency: string; precision?: number }): Money {
    return new Money(json.amount, json.currency, json.precision ?? 2);
  }

  get amount(): string {
    const divider = Math.pow(10, this.precision);
    return (Number(this.centsValue) / divider).toFixed(this.precision);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.centsValue + other.centsValue, this.currency, this.precision);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.centsValue - other.centsValue, this.currency, this.precision);
  }

  multiply(factor: number): Money {
    const multiplier = BigInt(Math.round(factor * 10000));
    const newCents = (this.centsValue * multiplier) / BigInt(10000);
    return new Money(newCents, this.currency, this.precision);
  }

  divide(divisor: number): Money {
    if (divisor === 0) throw new Error('Division by zero');
    const scale = BigInt(Math.round(divisor * 10000));
    const newCents = (this.centsValue * BigInt(10000)) / scale;
    return new Money(newCents, this.currency, this.precision);
  }

  percentage(rate: number): Money {
    return this.multiply(rate / 100);
  }

  tax(rate: number): Money {
    return this.percentage(rate);
  }

  discount(rate: number): Money {
    return this.percentage(rate);
  }

  serviceCharge(rate: number): Money {
    return this.percentage(rate);
  }

  compare(other: Money): number {
    this.assertSameCurrency(other);
    if (this.centsValue < other.centsValue) return -1;
    if (this.centsValue > other.centsValue) return 1;
    return 0;
  }

  equals(other: Money): boolean {
    return this.compare(other) === 0;
  }

  allocate(ratios: number[]): Money[] {
    const totalRatio = ratios.reduce((a, b) => a + b, 0);
    if (totalRatio === 0) throw new Error('Sum of ratios cannot be zero');

    let remainder = this.centsValue;
    const allocations: bigint[] = [];

    // Calculate integer shares
    const totalRatioBi = BigInt(Math.round(totalRatio * 10000));
    for (const ratio of ratios) {
      const ratioBi = BigInt(Math.round(ratio * 10000));
      const share = (this.centsValue * ratioBi) / totalRatioBi;
      allocations.push(share);
      remainder -= share;
    }

    // Allocate remaining fraction cent-by-cent
    let i = 0;
    while (remainder > BigInt(0)) {
      allocations[i] += BigInt(1);
      remainder -= BigInt(1);
      i = (i + 1) % allocations.length;
    }

    return allocations.map((val) => new Money(val, this.currency, this.precision));
  }

  format(locale = 'en-US'): string {
    const num = Number(this.centsValue) / Math.pow(10, this.precision);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: this.precision,
      maximumFractionDigits: this.precision,
    }).format(num);
  }

  toJSON(): { amount: string; currency: string; precision: number } {
    return {
      amount: this.amount,
      currency: this.currency,
      precision: this.precision,
    };
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: Cannot operate on different currencies (${this.currency} and ${other.currency})`);
    }
  }
}
