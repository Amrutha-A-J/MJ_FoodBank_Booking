import { z } from 'zod';

// Zod schema enforcing password complexity requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .refine(
    p =>
      /[a-z]/.test(p) &&
      /[A-Z]/.test(p) &&
      /[^A-Za-z0-9]/.test(p),
    {
      message: 'Password must include uppercase, lowercase, and special character',
    },
  );

// Returns null if valid, otherwise an error message
export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  if (result.success) return null;
  // combine issues into single message
  return result.error.issues[0]?.message || 'Invalid password';
}
