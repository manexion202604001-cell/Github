import { describe, expect, it } from 'vitest'
import { extractJson } from './json'

describe('extractJson', () => {
  it('素のJSONを解析する', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('コードフェンスを取り除く', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJson('```\n[1,2]\n```')).toEqual([1, 2])
  })

  it('前後の説明文があっても取り出す', () => {
    expect(extractJson('以下が結果です。\n{"a":1}\n以上です。')).toEqual({ a: 1 })
  })

  it('末尾カンマを許容する', () => {
    expect(extractJson('{"a":1,}')).toEqual({ a: 1 })
  })

  it('JSONが無ければ undefined を返す', () => {
    expect(extractJson('ただのテキスト')).toBeUndefined()
  })
})
