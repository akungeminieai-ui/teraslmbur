import { nanoid } from 'nanoid';

/**
 * Generate a unique ID using nanoid.
 * Default length is 21 characters (collision-safe).
 */
export function generateId(length: number = 21): string {
  return nanoid(length);
}
