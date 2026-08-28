/**
 * 対応SNS(要件5)。
 * コードへベタ書きせず、この定義を単一の出所とする。
 * 将来のチャネル追加は `enabled: true` を足すだけで全画面へ反映される。
 */
export type ChannelDefinition = {
  key: string
  label: string
  shortLabel: string
  /** 想定尺(秒)。台本生成の既定値と検証に使う。 */
  durations: number[]
  aspectRatio: string
  enabled: boolean
  /** 各SNSの文化。企画・台本プロンプトへ渡す。 */
  culture: string
}

export const CHANNELS: ChannelDefinition[] = [
  {
    key: 'instagram_reels',
    label: 'Instagram Reels',
    shortLabel: 'Reels',
    durations: [15, 30, 45, 60],
    aspectRatio: '9:16',
    enabled: true,
    culture:
      '世界観と保存性を重視。ビジュアルの統一感、テロップの可読性、保存したくなる情報の密度が効く。過度な煽りは嫌われる。',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    shortLabel: 'TikTok',
    durations: [15, 30, 45, 60],
    aspectRatio: '9:16',
    enabled: true,
    culture:
      '冒頭1〜2秒の引きと会話のテンポが最重要。作り込んだ広告らしさより等身大の一次情報が伸びる。コメントを誘発する余白を残す。',
  },
  {
    key: 'youtube_shorts',
    label: 'YouTube Shorts',
    shortLabel: 'Shorts',
    durations: [15, 30, 45, 60],
    aspectRatio: '9:16',
    enabled: true,
    culture:
      '検索と関連動画から流入するため、テーマの明確さと結論の速さが効く。ノウハウ・比較・検証と相性が良い。',
  },
  // ── 将来拡張(要件5)。enabled を true にすれば全画面の選択肢へ加わる。
  {
    key: 'instagram_feed',
    label: 'Instagram フィード',
    shortLabel: 'IG Feed',
    durations: [30, 60],
    aspectRatio: '4:5',
    enabled: false,
    culture: '静止画・カルーセルでの保存性重視。',
  },
  {
    key: 'x',
    label: 'X',
    shortLabel: 'X',
    durations: [15, 30],
    aspectRatio: '16:9',
    enabled: false,
    culture: 'テキスト主導。速報性と一言の切れ味。',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'LinkedIn',
    durations: [30, 60],
    aspectRatio: '1:1',
    enabled: false,
    culture: 'BtoBの知見共有。実務者に向けた具体性。',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    shortLabel: 'Facebook',
    durations: [30, 60],
    aspectRatio: '1:1',
    enabled: false,
    culture: '地域・年齢層が高めのコミュニティ。',
  },
  {
    key: 'youtube_long',
    label: 'YouTube 長尺',
    shortLabel: 'YouTube',
    durations: [180, 300, 600],
    aspectRatio: '16:9',
    enabled: false,
    culture: '検索流入と滞在時間。構成の設計が重要。',
  },
]

export const ACTIVE_CHANNELS = CHANNELS.filter((channel) => channel.enabled)
export const CHANNEL_KEYS = ACTIVE_CHANNELS.map((channel) => channel.key)

export function channelDefinition(key: string): ChannelDefinition | undefined {
  return CHANNELS.find((channel) => channel.key === key)
}

export function channelLabel(key: string): string {
  return channelDefinition(key)?.label ?? key
}

export function isActiveChannel(key: string): boolean {
  return CHANNEL_KEYS.includes(key)
}

export const DEFAULT_CHANNEL = CHANNEL_KEYS[0] ?? 'instagram_reels'
