import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ENABLE_MULTI_OUTLET: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  DEFAULT_CURRENCY: z.string().default('EGP'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
});

export default () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};
