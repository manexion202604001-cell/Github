/**
 * LLM のテキスト出力から JSON を抽出する。
 * ```json フェンス、前後の説明文、末尾カンマなど現実の揺れを吸収する(R7)。
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
  const candidate = fenced?.[1]?.trim() ?? trimmed

  const direct = tryParse(candidate)
  if (direct !== undefined) return direct

  const start = candidate.search(/[[{]/)
  if (start === -1) return undefined
  const opening = candidate[start]
  const closing = opening === '{' ? '}' : ']'
  const end = candidate.lastIndexOf(closing)
  if (end <= start) return undefined

  return tryParse(candidate.slice(start, end + 1))
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    try {
      return JSON.parse(value.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      return undefined
    }
  }
}
