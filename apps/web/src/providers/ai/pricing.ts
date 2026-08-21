/**
 * 概算コスト表(1トークンあたりのマイクロ円)。
 * 正確な請求額ではなく、社内の利用量把握と上限管理のための目安(要件116)。
 */
type Price = { input: number; output: number }

const TABLE: Record<string, Price> = {
  'anthropic:default': { input: 450, output: 2250 },
  'openai:default': { input: 380, output: 1500 },
  'google:default': { input: 120, output: 480 },
  'mock:default': { input: 0, output: 0 },
}

export function estimateTextCostMicro(
  provider: string,
  _model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = TABLE[`${provider}:default`] ?? TABLE['mock:default']
  if (!price) return 0
  return Math.round((inputTokens * price.input + outputTokens * price.output) / 1000)
}

/** 1枚あたりのマイクロ円。 */
const IMAGE_PRICE: Record<string, number> = {
  google: 6_000_000,
  openai: 12_000_000,
  mock: 0,
}

export function estimateImageCostMicro(provider: string, count: number): number {
  return (IMAGE_PRICE[provider] ?? 0) * count
}

/** 1秒あたりのマイクロ円。 */
const VIDEO_PRICE: Record<string, number> = {
  rest: 75_000_000,
  mock: 0,
}

export function estimateVideoCostMicro(provider: string, seconds: number): number {
  return (VIDEO_PRICE[provider] ?? 0) * seconds
}

/** ざっくりしたトークン推定(日本語は1文字≒0.7token、英数は4文字≒1token)。 */
const CJK = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/

export function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    tokens += CJK.test(char) ? 0.7 : 0.25
  }
  return Math.ceil(tokens)
}
