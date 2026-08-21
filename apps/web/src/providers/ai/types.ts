import type { z } from 'zod'
import type { Provider, ProviderOutcome } from '../types'

export type AIMessageInput = {
  role: 'user' | 'assistant'
  content: string
}

export type CompleteOptions = {
  system?: string
  messages: AIMessageInput[]
  maxTokens?: number
  temperature?: number
  model?: string
  /**
   * 外部由来(レビュー本文・スクレイピング結果など)のテキスト。
   * Adapter が `<untrusted_data>` で明示的に隔離する(要件111)。
   */
  untrusted?: { label: string; content: string }[]
}

export type CompletionResult = { text: string; model: string }

export interface AIProvider extends Provider {
  complete(options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>>
  /** Zodスキーマで検証された構造化出力を返す。検証失敗時は1度だけ自己修復を試みる。 */
  completeJson<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, options: CompleteOptions): Promise<ProviderOutcome<T>>
}
