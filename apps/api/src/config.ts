import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  DB_PATH: z.string().default('./data/quiz.db'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173'),
  // Postgres for leaderboard entries (production). Without it they go to the SQLite file.
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = {
  port: number;
  host: string;
  dbPath: string;
  corsOrigins: string[];
  databaseUrl?: string;
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
    ...(parsed.DATABASE_URL ? { databaseUrl: parsed.DATABASE_URL } : {}),
  };
}
