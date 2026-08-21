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
  usage?: { input_tokens?: number; output_tokens?: number }
}

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

    const result = await postJson(this.id, API_URL, {
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system: buildSystemPrompt(options),
        messages: options.messages.map((message) => ({ role: message.role, content: message.content })),
      },
    })

    if (!result.ok) return { ok: false, error: result.error, usage: usageFor(this.id, model) }

    const body = result.body as AnthropicResponse
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
