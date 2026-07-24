/**
 * Generate a unique ID using Web Crypto API.
 * Default length is 21 characters (collision-safe).
 */
export function generateId(length: number = 21): string {
  const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const array = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[array[i]! % ALPHABET.length];
  }
  return id;
}
