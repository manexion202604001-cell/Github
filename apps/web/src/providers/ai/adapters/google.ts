import { providerError, type ProviderOutcome } from '../../types'
import { BaseAIProvider, usageFor } from '../base'
import { buildSystemPrompt } from '../prompt-safety'
import { estimateTextCostMicro } from '../pricing'
import type { CompleteOptions, CompletionResult } from '../types'
import { postJson } from './http'

const DEFAULT_MODEL = 'gemini-2.5-flash'

type GoogleResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

export class GoogleAIProvider extends BaseAIProvider {
  readonly id = 'google'

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

    const result = await postJson(this.id, url, {
      headers: { 'x-goog-api-key': this.apiKey },
      body: {
        systemInstruction: { parts: [{ text: buildSystemPrompt(options) }] },
        contents: options.messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
      },
    })

    if (!result.ok) return { ok: false, error: result.error, usage: usageFor(this.id, model) }

    const body = result.body as GoogleResponse
    const text = (body.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim()

    if (!text) {
      return {
        ok: false,
        error: providerError(this.id, 'INVALID_RESPONSE', '本文が空の応答を受け取りました'),
        usage: usageFor(this.id, model),
      }
    }

    const inputTokens = body.usageMetadata?.promptTokenCount ?? 0
    const outputTokens = body.usageMetadata?.candidatesTokenCount ?? 0

    return {
      ok: true,
      data: { text, model },
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
