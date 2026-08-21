/** サンプル評価項目(要件49)。各10点。UIとserviceで共有。 */
export const SAMPLE_CRITERIA = [
  { key: 'design', label: 'デザイン' },
  { key: 'texture', label: '質感' },
  { key: 'weight', label: '重量' },
  { key: 'size', label: 'サイズ' },
  { key: 'durability', label: '耐久性' },
  { key: 'usability', label: '使用感' },
  { key: 'cleanability', label: '清掃性' },
  { key: 'packaging', label: '梱包' },
  { key: 'competitiveness', label: '競合比較' },
] as const

export type SampleScoreKey = (typeof SAMPLE_CRITERIA)[number]['key']
