import { providerError, type ProviderOutcome } from '../../types'
import { BaseAIProvider, usageFor } from '../base'
import { buildSystemPrompt } from '../prompt-safety'
import { estimateTextCostMicro } from '../pricing'
import type { CompleteOptions, CompletionResult } from '../types'
import { postJson } from './http'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-5'

type AnthropicResponse = {
  content?: { type: string; text?: string }[]
  model?: string
  stop_reason?: string
  usage?: { input_tokens?: number; output_tokens?: number }
}

/** JSONモード時の出力上限。max_tokens打ち切りでJSONが途切れるのを防ぐ床値と再試行上限。 */
const JSON_MIN_MAX_TOKENS = 16000
const JSON_RETRY_MAX_TOKENS = 32000

export class AnthropicAIProvider extends BaseAIProvider {
  readonly id = 'anthropic'

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {
    super()
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async complete(options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>> {
    const model = options.model || this.defaultModel || DEFAULT_MODEL
    const startedAt = Date.now()

    // JSONモードでは打ち切り(stop_reason: max_tokens)がスキーマ不適合の主因のため、
    // 床値を確保し、それでも切れた場合は1度だけ上限を倍にして再試行する。
    let maxTokens = options.maxTokens ?? 4096
    if (options.jsonMode) maxTokens = Math.max(maxTokens, JSON_MIN_MAX_TOKENS)

    for (;;) {
      const result = await postJson(this.id, API_URL, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        // temperatureは送らない: Claude 4.6以降のモデル(claude-opus-5等)は
        // temperature指定を400で拒否するため、モデル既定のサンプリングに任せる。
        body: {
          model,
          max_tokens: maxTokens,
          system: buildSystemPrompt(options),
          messages: options.messages.map((message) => ({ role: message.role, content: message.content })),
        },
        timeoutMs: 240_000,
      })

      if (!result.ok) return { ok: false, error: result.error, usage: usageFor(this.id, model) }

      const body = result.body as AnthropicResponse
      const truncated = body.stop_reason === 'max_tokens'
      if (options.jsonMode && truncated && maxTokens < JSON_RETRY_MAX_TOKENS) {
        maxTokens = Math.min(maxTokens * 2, JSON_RETRY_MAX_TOKENS)
        continue
      }

      const text = (body.content ?? [])
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text ?? '')
        .join('\n')
        .trim()

      if (!text) {
        return {
          ok: false,
          error: providerError(this.id, 'INVALID_RESPONSE', '本文が空の応答を受け取りました'),
          usage: usageFor(this.id, model),
        }
      }

      if (options.jsonMode && truncated) {
        return {
          ok: false,
          error: providerError(this.id, 'INVALID_RESPONSE', `出力がmax_tokens(${maxTokens})で打ち切られました`),
          usage: usageFor(this.id, model),
        }
      }

      const inputTokens = body.usage?.input_tokens ?? 0
      const outputTokens = body.usage?.output_tokens ?? 0

      return {
        ok: true,
        data: { text, model: body.model ?? model },
        usage: {
          ...usageFor(this.id, model),
          inputTokens,
          outputTokens,
          estimatedCostMicro: estimateTextCostMicro(this.id, model, inputTokens, outputTokens),
          latencyMs: Date.now() - startedAt,
        },
      }
    }
  }
}
