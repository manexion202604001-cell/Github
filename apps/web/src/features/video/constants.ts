import type { AspectRatio, VideoPurpose, VideoType } from '@prisma/client'

/** UIとserviceで共有する定数(要件60〜62, 68)。server-only を含めない。 */
export const VIDEO_PURPOSES: { value: VideoPurpose; label: string }[] = [
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'INSTAGRAM_REELS', label: 'Instagram Reels' },
  { value: 'YOUTUBE_SHORTS', label: 'YouTube Shorts' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'ADS', label: '広告' },
]

export const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: 'PRODUCT_INTRO', label: '商品紹介' },
  { value: 'UGC', label: 'UGC' },
  { value: 'PROBLEM_SOLVING', label: '問題解決' },
  { value: 'COMPARISON', label: '比較' },
  { value: 'LUXURY_BRAND', label: '高級ブランド' },
  { value: 'DEMONSTRATION', label: '実演' },
  { value: 'SNS_AD', label: 'SNS広告' },
]

export const VIDEO_DURATIONS = [5, 10, 15, 30, 60]

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: 'RATIO_9_16', label: '9:16(縦)' },
  { value: 'RATIO_16_9', label: '16:9(横)' },
  { value: 'RATIO_1_1', label: '1:1(正方形)' },
]

export function aspectRatioToString(value: AspectRatio): '9:16' | '16:9' | '1:1' {
  switch (value) {
    case 'RATIO_16_9':
      return '16:9'
    case 'RATIO_1_1':
      return '1:1'
    default:
      return '9:16'
  }
}
