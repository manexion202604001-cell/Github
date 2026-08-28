/**
 * 台本の純粋なロジック。シーンの時間整合と書き出しを扱う。
 */
export type SceneLike = {
  position: number
  startSecond: number
  endSecond: number
  visual: string
  voice: string
  onscreenText: string | null
  camera: string | null
  assets: string[]
  purpose: string | null
}

/**
 * シーンの時間を、指定尺に収まる形へ整える。
 * AIの出力は開始/終了が重なったり尺を超えたりするため、保存前に必ず通す。
 */
export function normalizeTimeline<T extends { startSecond: number; endSecond: number }>(
  scenes: T[],
  totalSeconds: number,
): T[] {
  if (scenes.length === 0) return scenes

  let cursor = 0
  const normalized = scenes.map((scene, index) => {
    const start = index === 0 ? 0 : cursor
    const declared = Math.max(scene.endSecond - scene.startSecond, 1)
    const end = Math.min(totalSeconds, start + declared)
    cursor = end
    return { ...scene, startSecond: start, endSecond: Math.max(end, start + 1) }
  })

  // 最後のシーンの終端は指定尺に一致させる(要件97: 動画尺を超えない)。
  const last = normalized[normalized.length - 1]
  if (last) last.endSecond = totalSeconds

  return normalized
}

export function totalDuration(scenes: { startSecond: number; endSecond: number }[]): number {
  return scenes.reduce((max, scene) => Math.max(max, scene.endSecond), 0)
}

/** 並び替え後に position を振り直す。 */
export function reindex<T>(items: T[]): (T & { position: number })[] {
  return items.map((item, index) => ({ ...item, position: index }))
}

export type ScriptExport = {
  title: string
  brandName: string
  channelLabel: string
  durationSec: number
  styleLabel: string
  toneLabel: string
  hook: string
  cta: string | null
  scenes: SceneLike[]
}

/** Markdown ダウンロード / コピー(要件102)。 */
export function toMarkdown(script: ScriptExport): string {
  const lines: string[] = [
    `# ${script.title}`,
    '',
    `- ブランド: ${script.brandName}`,
    `- SNS: ${script.channelLabel}`,
    `- 尺: ${script.durationSec}秒`,
    `- 出演スタイル: ${script.styleLabel}`,
    `- トーン: ${script.toneLabel}`,
    `- Hook: ${script.hook}`,
    script.cta ? `- CTA: ${script.cta}` : '',
    '',
  ].filter(Boolean)

  for (const scene of script.scenes) {
    lines.push(
      `## Scene ${scene.position + 1} — ${scene.startSecond}〜${scene.endSecond}秒${scene.purpose ? ` [${scene.purpose}]` : ''}`,
      '',
      `- VISUAL: ${scene.visual}`,
      `- VOICE: ${scene.voice}`,
      `- TEXT: ${scene.onscreenText ?? '—'}`,
      `- CAMERA: ${scene.camera ?? '—'}`,
      `- ASSET: ${scene.assets.join(' / ') || '—'}`,
      '',
    )
  }

  return lines.join('\n')
}
