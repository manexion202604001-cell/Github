import 'server-only'

/**
 * サーバー専用の環境変数アクセサ。
 * ここ以外で `process.env` を読まないことで、秘密情報がクライアントバンドルへ
 * 混入する経路を1箇所に閉じ込める(要件110)。
 */
function read(key: string, fallback = ''): string {
  const value = process.env[key]
  return value === undefined || value === '' ? fallback : value
}

function readBool(key: string, fallback: boolean): boolean {
  const value = process.env[key]
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

function readInt(key: string, fallback: number): number {
  const parsed = Number.parseInt(read(key, ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  databaseUrl: read('DATABASE_URL'),
  appUrl: read('APP_URL', 'http://localhost:3000'),
  authSecret: read('AUTH_SECRET', 'insecure-development-secret-change-me'),
  encryptionKey: read('ENCRYPTION_KEY', 'insecure-development-encryption-key'),
  isProduction: process.env.NODE_ENV === 'production',

  google: {
    clientId: read('GOOGLE_CLIENT_ID'),
    clientSecret: read('GOOGLE_CLIENT_SECRET'),
  },

  ai: {
    provider: read('AI_PROVIDER', 'mock'),
    model: read('AI_MODEL'),
    anthropicKey: read('ANTHROPIC_API_KEY'),
    openaiKey: read('OPENAI_API_KEY'),
    googleKey: read('GOOGLE_AI_API_KEY'),
  },
  image: {
    provider: read('IMAGE_PROVIDER', 'mock'),
    model: read('IMAGE_MODEL'),
  },
  video: {
    provider: read('VIDEO_PROVIDER', 'mock'),
    baseUrl: read('VIDEO_PROVIDER_BASE_URL'),
    apiKey: read('VIDEO_PROVIDER_API_KEY'),
    webhookSecret: read('VIDEO_WEBHOOK_SECRET'),
  },
  marketData: {
    provider: read('MARKET_DATA_PROVIDER', 'mock'),
    rakutenApplicationId: read('RAKUTEN_APPLICATION_ID'),
    rainforestApiKey: read('RAINFOREST_API_KEY'),
    amazonDomain: read('AMAZON_DOMAIN', 'amazon.co.jp'),
    scraperBaseUrl: read('SCRAPER_BASE_URL'),
    scraperUserAgent: read('SCRAPER_USER_AGENT', 'MANEXION-ProductOS/1.0'),
    scraperMinIntervalMs: readInt('SCRAPER_MIN_INTERVAL_MS', 2000),
    scraperRespectRobots: readBool('SCRAPER_RESPECT_ROBOTS', true),
  },
  storage: {
    provider: read('STORAGE_PROVIDER', 'local'),
    localDir: read('STORAGE_LOCAL_DIR', '.storage'),
    supabase: {
      url: read('SUPABASE_URL'),
      serviceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
      bucket: read('SUPABASE_STORAGE_BUCKET', 'product-os'),
    },
    s3: {
      endpoint: read('S3_ENDPOINT'),
      region: read('S3_REGION'),
      bucket: read('S3_BUCKET'),
      accessKeyId: read('S3_ACCESS_KEY_ID'),
      secretAccessKey: read('S3_SECRET_ACCESS_KEY'),
      publicBaseUrl: read('S3_PUBLIC_BASE_URL'),
    },
  },

  mail: {
    provider: read('MAIL_PROVIDER', 'console'),
    resendApiKey: read('RESEND_API_KEY'),
    from: read('MAIL_FROM', 'UCCHAU <onboarding@resend.dev>'),
  },

  jobs: {
    inline: readBool('JOBS_INLINE', true),
    workerToken: read('JOB_WORKER_TOKEN'),
  },
} as const

export type Env = typeof env
