import type { CompleteOptions, CompletionResult, ProviderOutcome } from '../types'
import { BaseAIProvider, usageFor } from '../base'

/**
 * APIキー未設定時のフォールバック(要件99 Demo Mode)。
 * 実際の生成は行わない。各AITaskが持つ固定サンプル(fixture)を
 * runAITask 側で返すため、この Provider が推論を模倣することはない。
 */
export class MockAIProvider extends BaseAIProvider {
  readonly id = 'mock'
  override readonly synthetic = true

  isConfigured(): boolean {
    return true
  }

  async generateText(_options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>> {
    return {
      ok: true,
      data: { text: '{}', model: 'mock' },
      usage: usageFor(this.id, 'mock'),
    }
  }
}
