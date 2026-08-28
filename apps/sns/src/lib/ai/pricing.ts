/**
 * 概算コスト表(1000トークンあたりのマイクロ円)。
 * 正確な請求額ではなく、利用量把握のための目安(要件68)。
 */
const TABLE: Record<string, { input: number; output: number }> = {
  anthropic: { input: 450, output: 2250 },
  openai: { input: 380, output: 1500 },
  mock: { input: 0, output: 0 },
}

export function estimateCostMicro(provider: string, inputTokens: number, outputTokens: number): number {
  const price = TABLE[provider] ?? TABLE.mock!
  return Math.round((inputTokens * price.input + outputTokens * price.output) / 1000)
}

/** ざっくりしたトークン推定(日本語は1文字≒0.7token、英数は4文字≒1token)。 */
const CJK = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/

export function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) tokens += CJK.test(char) ? 0.7 : 0.25
  return Math.ceil(tokens)
}
