/**
 * LLM のテキスト出力から JSON を抽出する。
 * ```json フェンス(閉じ忘れ含む)、前後の説明文、末尾カンマ、
 * 文字列内の生制御文字など現実の揺れを吸収する(R7)。
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
  // フェンスを開いたまま出力が終わるモデルがあるため、閉じフェンスなしも候補にする
  const openFence = fenced ? null : /```(?:json)?\s*([\s\S]*)$/i.exec(trimmed)
  const candidate = (fenced?.[1] ?? openFence?.[1] ?? trimmed).trim()

  const direct = tryParse(candidate)
  if (direct !== undefined) return direct

  const start = candidate.search(/[[{]/)
  if (start === -1) return undefined

  // 括弧の対応を数えて過不足なく切り出す(JSONの後ろに説明文が続いても壊れない)
  const balanced = sliceBalanced(candidate, start)
  if (balanced !== undefined) {
    const parsed = tryParse(balanced)
    if (parsed !== undefined) return parsed
  }

  const closing = candidate[start] === '{' ? '}' : ']'
  const end = candidate.lastIndexOf(closing)
  if (end <= start) return undefined
  return tryParse(candidate.slice(start, end + 1))
}

/** 文字列リテラルを考慮しつつ括弧の深さを追い、最初に閉じ切った位置までを返す。 */
function sliceBalanced(text: string, start: number): string | undefined {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{' || char === '[') depth += 1
    else if (char === '}' || char === ']') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return undefined
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    /* 続けて修復を試す */
  }
  const withoutTrailingComma = value.replace(/,\s*([}\]])/g, '$1')
  try {
    return JSON.parse(withoutTrailingComma)
  } catch {
    /* 続けて修復を試す */
  }
  try {
    return JSON.parse(escapeControlCharsInStrings(withoutTrailingComma))
  } catch {
    return undefined
  }
}

/** 文字列リテラル内の生の改行・タブ等(JSONでは不正)をエスケープする。 */
function escapeControlCharsInStrings(value: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (const char of value) {
    if (!inString) {
      if (char === '"') inString = true
      out += char
      continue
    }
    if (escaped) {
      out += char
      escaped = false
      continue
    }
    if (char === '\\') {
      out += char
      escaped = true
      continue
    }
    if (char === '"') {
      inString = false
      out += char
      continue
    }
    const code = char.charCodeAt(0)
    if (code < 0x20) {
      out +=
        code === 10 ? '\\n' : code === 13 ? '\\r' : code === 9 ? '\\t' : `\\u${code.toString(16).padStart(4, '0')}`
      continue
    }
    out += char
  }
  return out
}
