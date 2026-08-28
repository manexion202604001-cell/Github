/**
 * 動画生成AI向けプロンプトの書き方プリセット(要件38)。
 * 外部の動画生成APIとは通信しない。プロンプトの整形方針のみを保持する。
 * 各サービスの仕様変更に追随できるよう、ここだけを更新すれば済む形にしている。
 */
export type VideoPresetDefinition = {
  key: string
  label: string
  description: string
  /** 生成AIへ渡す「書き方」の指示。プロンプト生成時にAIへ添える。 */
  guidance: string
  /** 既定の Negative Prompt。 */
  negativeDefaults: string[]
  maxSeconds: number
}

export const VIDEO_PRESETS: VideoPresetDefinition[] = [
  {
    key: 'generic',
    label: 'Generic',
    description: 'サービスを問わず使える標準構造',
    guidance:
      'Subject / Action / Environment / Camera / Lighting / Style / Duration / Aspect Ratio を各1〜2文で明示し、曖昧な形容詞を避けて撮影可能な描写にする。',
    negativeDefaults: ['no text', 'no logo', 'no distorted hands', 'no watermark'],
    maxSeconds: 10,
  },
  {
    key: 'veo',
    label: 'Veo',
    description: '映像の連続性とカメラワークを重視した記述',
    guidance:
      'カメラの動き(dolly / pan / handheld)とレンズを具体的に書き、1プロンプト＝1カットとして時間経過を1文で説明する。被写体の一貫性を Continuity に明記する。',
    negativeDefaults: ['no on-screen text', 'no logo', 'no morphing artifacts', 'no unrealistic anatomy'],
    maxSeconds: 8,
  },
  {
    key: 'sora',
    label: 'Sora',
    description: '情景描写を厚めに、物理的な整合性を明示',
    guidance:
      '空間・素材・光の物理的な整合性を重視し、シーン全体を1段落で描写したうえでカメラと尺を最後に添える。',
    negativeDefaults: ['no text overlay', 'no brand logo', 'no impossible physics'],
    maxSeconds: 10,
  },
  {
    key: 'runway',
    label: 'Runway',
    description: '短く強い1文＋カメラ指定',
    guidance:
      '冒頭に被写体と動作を1文で凝縮し、その後にカメラ・ライティング・スタイルを句で列挙する。長文にしない。',
    negativeDefaults: ['no text', 'no logo', 'no flicker'],
    maxSeconds: 10,
  },
  {
    key: 'kling',
    label: 'Kling',
    description: '被写体の動きと表情を具体的に',
    guidance:
      '人物の表情・手の動き・視線を具体的に記述し、背景は簡潔にする。動きの速度(slow / steady)を明示する。',
    negativeDefaults: ['no text', 'no logo', 'no distorted face', 'no extra fingers'],
    maxSeconds: 10,
  },
]

export const VIDEO_PRESET_KEYS = VIDEO_PRESETS.map((preset) => preset.key)

export function videoPreset(key: string): VideoPresetDefinition {
  return VIDEO_PRESETS.find((preset) => preset.key === key) ?? VIDEO_PRESETS[0]!
}

export const PROMPT_LANGUAGES = [
  { key: 'en', label: 'English', description: '生成AIへの入力は英語を推奨' },
  { key: 'ja', label: '日本語', description: '内容確認・社内共有用' },
] as const
