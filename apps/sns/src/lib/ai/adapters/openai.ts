import { providerError, type CompleteOptions, type CompletionResult, type ProviderOutcome } from '../types'
import { BaseAIProvider, usageFor } from '../base'
import { buildSystemPrompt } from '../prompt-safety'
import { estimateCostMicro } from '../pricing'
import { postJson } from './http'

const API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4.1'

type OpenAIResponse = {
  choices?: { message?: { content?: string } }[]
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

export class OpenAIProvider extends BaseAIProvider {
  readonly id = 'openai'

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

    const result = await postJson(this.id, API_URL, {
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: {
        model,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: buildSystemPrompt(options) },
          ...options.messages.map((message) => ({ role: message.role, content: message.content })),
        ],
      },
    })

    if (!result.ok) return { ok: false, error: result.error, usage: usageFor(this.id, model) }

    const body = result.body as OpenAIResponse
    const text = body.choices?.[0]?.message?.content?.trim() ?? ''
    if (!text) {
      return {
        ok: false,
        error: providerError(this.id, 'INVALID_RESPONSE', '本文が空の応答を受け取りました'),
        usage: usageFor(this.id, model),
      }
    }

    const inputTokens = body.usage?.prompt_tokens ?? 0
    const outputTokens = body.usage?.completion_tokens ?? 0

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
