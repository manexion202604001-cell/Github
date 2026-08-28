import { providerError, type CompleteOptions, type CompletionResult, type ProviderOutcome } from '../types'
import { BaseAIProvider, usageFor } from '../base'
import { buildSystemPrompt } from '../prompt-safety'
import { estimateCostMicro } from '../pricing'
import { postJson } from './http'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-5'

/** JSONモードでの打ち切り対策。床値を確保し、切れたら1度だけ上限を倍にする。 */
const JSON_MIN_MAX_TOKENS = 16_000
const JSON_RETRY_MAX_TOKENS = 32_000

type AnthropicResponse = {
  content?: { type: string; text?: string }[]
  model?: string
  stop_reason?: string
  usage?: { input_tokens?: number; output_tokens?: number }
}

export class AnthropicProvider extends BaseAIProvider {
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

  async generateText(options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>> {
    const model = this.defaultModel || DEFAULT_MODEL
    const startedAt = Date.now()
    let maxTokens = options.maxTokens ?? 4096
    if (options.jsonMode) maxTokens = Math.max(maxTokens, JSON_MIN_MAX_TOKENS)

    for (;;) {
      const result = await postJson(this.id, API_URL, {
        headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
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
          error: providerError(this.id, 'INVALID_RESPONSE', `出力が上限(${maxTokens} tokens)で打ち切られました`),
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
          estimatedCostMicro: estimateCostMicro(this.id, inputTokens, outputTokens),
          latencyMs: Date.now() - startedAt,
        },
      }
    }
  }
}
