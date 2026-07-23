import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  roleId: z.string().min(1, 'Role is required'),
  outletId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
