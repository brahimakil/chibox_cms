import { randomBytes } from 'crypto';

export const COOKIE_NAME = 'auth-token';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

