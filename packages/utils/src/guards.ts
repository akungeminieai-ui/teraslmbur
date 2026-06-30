/** Type guard: value is not null or undefined */
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/** Type guard: value is defined (not undefined) */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/** Type guard: value is a string */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Type guard: value is a number */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}
