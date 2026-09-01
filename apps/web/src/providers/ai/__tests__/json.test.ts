import { describe, expect, it } from 'vitest'
import { extractJson } from '../json'

describe('extractJson', () => {
  it('素のJSONを抽出できる', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('コードフェンス付きJSONを抽出できる', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('閉じられていないコードフェンスでも抽出できる', () => {
    expect(extractJson('```json\n{"a":1}')).toEqual({ a: 1 })
  })

  it('前後に説明文があっても抽出できる', () => {
    expect(extractJson('結果は以下の通りです。\n{"a":1}\nご確認ください。')).toEqual({ a: 1 })
  })

  it('JSONの後ろの説明文に閉じ括弧が含まれても壊れない', () => {
    expect(extractJson('{"a":1}\n補足: {b:2} のような形式は使いません。追記 }')).toEqual({ a: 1 })
  })

  it('末尾カンマを修復できる', () => {
    expect(extractJson('{"a":1,}')).toEqual({ a: 1 })
    expect(extractJson('{"list":[1,2,],}')).toEqual({ list: [1, 2] })
  })

  it('文字列内の生の改行・タブをエスケープして修復できる', () => {
    expect(extractJson('{"text":"1行目\n2行目\tタブ"}')).toEqual({ text: '1行目\n2行目\tタブ' })
  })

  it('文字列内の括弧はネスト数に数えない', () => {
    expect(extractJson('{"text":"括弧 } を含む"}')).toEqual({ text: '括弧 } を含む' })
  })

  it('配列ルートも抽出できる', () => {
    expect(extractJson('回答:\n[{"a":1},{"a":2}]')).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('JSONが無いテキストはundefined', () => {
    expect(extractJson('JSONはありません')).toBeUndefined()
  })

  it('途中で切れたJSONはundefined', () => {
    expect(extractJson('{"a": {"b": 1')).toBeUndefined()
  })
})
