import 'server-only'

/**
 * サーバー専用の環境変数アクセサ。
 * ここ以外で process.env を読まないことで、APIキーがクライアントバンドルへ
 * 混入する経路を1箇所に閉じ込める(要件67)。
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

/**
 * 本番でのみ必須のシークレット。既定値のまま署名・暗号化される事故を防ぐ。
 * import 時ではなく参照時に検査する(ビルド時にはシークレットが無いため)。
 */
function readSecret(key: string, developmentFallback: string): string {
  const value = process.env[key]
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`環境変数 ${key} が未設定です。本番環境では必須です。`)
  }
  return developmentFallback
}

export const env = {
  databaseUrl: read('DATABASE_URL'),
  appUrl: read('APP_URL', 'http://localhost:3100'),
  isProduction: process.env.NODE_ENV === 'production',
  /** APIキー無しでも全画面が動く開発モード(要件99)。 */
  demoMode: readBool('DEMO_MODE', false),

  get authSecret(): string {
    return readSecret('AUTH_SECRET', 'insecure-development-secret-change-me')
  },

  ai: {
    provider: read('AI_PROVIDER', 'mock'),
    model: read('AI_MODEL'),
    anthropicKey: read('ANTHROPIC_API_KEY'),
    openaiKey: read('OPENAI_API_KEY'),
  },

  search: {
    provider: read('SEARCH_PROVIDER', 'mock'),
    tavilyKey: read('TAVILY_API_KEY'),
    braveKey: read('BRAVE_SEARCH_API_KEY'),
    serpApiKey: read('SERPAPI_API_KEY'),
  },
} as const

export type Env = typeof env
