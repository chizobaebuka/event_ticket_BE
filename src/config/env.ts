import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DB_HOST: z.string().min(1, 'DB_HOST is required'),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_USER: z.string().min(1, 'DB_USER is required'),
    DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
    DB_NAME: z.string().min(1, 'DB_NAME is required'),
    JWT_SECRET_KEY: z.string().min(1, 'JWT_SECRET_KEY is required'),
    JWT_EXPIRES_IN: z.string().default('1h'),
    RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

function loadEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${issues}`);
    }

    return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
