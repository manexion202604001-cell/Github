/**
 * メンション（COM-05）の純粋関数。
 * 表示名にスペースは含まれない前提で `@表示名` を抽出する。
 * 句読点・括弧・引用符は表示名に含めない（`@aki、こんにちは` → `aki`）。
 */
const NAME_CHARS = String.raw`[^\s@、。,.!?！？:;（）()\[\]「」『』"']`
const MENTION_RE = new RegExp(`(^|[^\\w@])@(${NAME_CHARS}{1,40})(?!${NAME_CHARS})`, 'gu')

/** 本文中の `@表示名` を重複なしで抽出する（順序は出現順） */
export function extractMentions(text: string): string[] {
  const names: string[] = []
  for (const m of text.matchAll(MENTION_RE)) {
    const name = m[2] ?? ''
    if (name && !names.includes(name)) names.push(name)
  }
  return names
}

/**
 * `@表示名` を `[@表示名](/members/<userId>)` に置換する（Markdown に渡す前処理）。
 * `mentions` に存在する表示名のみリンク化する。
 */
export function applyMentionLinks(text: string, mentions: Record<string, string>): string {
  if (Object.keys(mentions).length === 0) return text
  return text.replace(MENTION_RE, (whole: string, prefix: string, name: string) => {
    const id = mentions[name]
    if (!id) return whole
    return `${prefix}[@${name}](/members/${id})`
  })
}
