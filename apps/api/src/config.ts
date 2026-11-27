import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  DB_PATH: z.string().default('./data/quiz.db'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = {
  port: number;
  host: string;
  dbPath: string;
  corsOrigins: string[];
  logLevel: z.infer<typeof envSchema>['LOG_LEVEL'];
};

/** Reads configuration from environment variables and fails fast if any are invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.parse(env);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    dbPath: parsed.DB_PATH,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    logLevel: parsed.LOG_LEVEL,
  };
}
