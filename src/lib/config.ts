import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}, z.boolean());

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@localhost:5432/vouch'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  XLAYER_RPC_URL: z.string().url().default('https://rpc.xlayer.tech'),
  OKX_AI_INDEXER_URL: z.string().optional(),
  OKX_PAYMENT_BASE_URL: z.string().optional(),
  VOUCH_SIGNING_PRIVATE_KEY: z.string().optional(),
  REPUTATION_DATA_SOURCE_MODE: z.enum(['null']).default('null'),
  CAPABILITY_CERT_QUEUE_MODE: z.enum(['in-process']).default('in-process'),
  CAPABILITY_UPTIME_REQUESTS: z.coerce.number().int().positive().default(5),
  CAPABILITY_UPTIME_INTERVAL_MS: z.coerce.number().int().nonnegative().default(6_000),
  X402_MODE: z.enum(['mock', 'okx']).default('mock'),
  X402_ACCEPTED_ASSET: z.string().default('USDC'),
  X402_NETWORK: z.string().default('xlayer'),
  X402_PAYMENT_ADDRESS: z.string().default('0x000000000000000000000000000000000000dEaD'),
  X402_MOCK_SECRET: z.string().default('vouch-dev-x402-secret'),
  PAYMENTS_REQUIRED: booleanFromEnv.default(false)
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}
