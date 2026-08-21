import { providerError, type ProviderOutcome } from '../../types'
import { BaseAIProvider, usageFor } from '../base'
import type { CompleteOptions, CompletionResult } from '../types'

/**
 * APIキーなしでもアプリ全体が動作するための疑似Provider。
 * 構造化出力は各 prompts/*.ts が持つ mock データを AITask ランナーが返すため、
 * ここでは自由記述の応答のみを扱う(要件121: Mock/Production分離)。
 */
export class MockAIProvider extends BaseAIProvider {
  readonly id = 'mock'
  override readonly synthetic = true

  isConfigured(): boolean {
    return true
  }

  async complete(options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>> {
    const last = options.messages.at(-1)
    if (!last) {
      return {
        ok: false,
        error: providerError(this.id, 'INVALID_RESPONSE', 'メッセージが空です'),
        usage: usageFor(this.id, 'mock'),
      }
    }

    const text = [
      '【サンプル応答】AI Providerが未設定のため、モック応答を返しています。',
      '',
      `ご質問: ${last.content.slice(0, 200)}`,
      '',
      '実際のAIによる回答を得るには、環境変数 AI_PROVIDER と各APIキーを設定してください。',
      'それまでの間も、プロジェクトの保存・編集・シミュレーションなどAIに依存しない機能はすべて利用できます。',
    ].join('\n')

    return { ok: true, data: { text, model: 'mock' }, usage: usageFor(this.id, 'mock') }
  }
}
