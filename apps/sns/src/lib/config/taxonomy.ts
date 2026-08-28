/**
 * 企画・台本まわりの分類。SNSと同じく設定値として一箇所に集約する。
 */
export type Option = { key: string; label: string; description?: string }

/** SNS運用目的(要件10 STEP4)。 */
export const SNS_GOALS: Option[] = [
  { key: 'awareness', label: '認知拡大', description: 'まだ知られていない層へ届ける' },
  { key: 'followers', label: 'フォロワー獲得', description: '継続接点をつくる' },
  { key: 'inquiry', label: '問い合わせ獲得', description: '相談・見積もりにつなげる' },
  { key: 'document', label: '資料請求', description: '検討段階のリードを取る' },
  { key: 'purchase', label: '商品購入', description: 'EC・直販の売上へつなげる' },
  { key: 'store', label: '店舗集客', description: '来店・予約を増やす' },
  { key: 'recruit', label: '採用', description: '働く人・職場を伝える' },
  { key: 'branding', label: 'ブランディング', description: '想起と信頼を積み上げる' },
]

/** 市場調査の目的(要件14)。 */
export const RESEARCH_OBJECTIVES: Option[] = [
  { key: 'market', label: '市場把握', description: '市場の変化と需要を掴む' },
  { key: 'sns_plan', label: 'SNS企画', description: '発信テーマを決める' },
  { key: 'competitor', label: '競合分析', description: '競合の発信と差別化余地' },
  { key: 'new_product', label: '新商品', description: '新しい打ち手の検討' },
  { key: 'acquisition', label: '集客', description: '来店・問い合わせを増やす' },
  { key: 'recruit', label: '採用', description: '採用広報の切り口を探す' },
]

/** 調査深度(要件14)。検索クエリ数と分析量を決める。 */
export const RESEARCH_DEPTHS = [
  { key: 'QUICK', label: 'Quick', description: '要点だけを短時間で', queries: 4, insights: 8 },
  { key: 'STANDARD', label: 'Standard', description: '標準。競合と顧客まで', queries: 8, insights: 14 },
  { key: 'DEEP', label: 'Deep', description: '深掘り。機会領域まで', queries: 14, insights: 20 },
] as const

export type ResearchDepthKey = (typeof RESEARCH_DEPTHS)[number]['key']

export function depthSettings(key: string) {
  return RESEARCH_DEPTHS.find((depth) => depth.key === key) ?? RESEARCH_DEPTHS[1]
}

/** 企画カテゴリー(要件23)。 */
export const IDEA_CATEGORIES: Option[] = [
  { key: 'education', label: 'Education', description: '知識を届ける' },
  { key: 'how_to', label: 'How To', description: 'やり方を見せる' },
  { key: 'faq', label: 'FAQ', description: 'よくある質問に答える' },
  { key: 'comparison', label: 'Comparison', description: '比較して選び方を示す' },
  { key: 'myth_busting', label: 'Myth Busting', description: '誤解を正す' },
  { key: 'case_study', label: 'Case Study', description: '事例で語る' },
  { key: 'before_after', label: 'Before After', description: '変化を見せる' },
  { key: 'behind_the_scenes', label: 'Behind The Scenes', description: '裏側を見せる' },
  { key: 'story', label: 'Story', description: '物語で伝える' },
  { key: 'founder', label: 'Founder', description: '創業者・想いを伝える' },
  { key: 'expert', label: 'Expert', description: '専門家の視点' },
  { key: 'ranking', label: 'Ranking', description: '順位で整理する' },
  { key: 'checklist', label: 'Checklist', description: '確認項目にする' },
  { key: 'seasonal', label: 'Seasonal', description: '季節・時期に合わせる' },
  { key: 'trend', label: 'Trend', description: '話題に乗る' },
  { key: 'problem', label: 'Problem', description: '悩みから入る' },
  { key: 'mistake', label: 'Mistake', description: '失敗例から学ぶ' },
  { key: 'reaction', label: 'Reaction', description: '反応・検証で見せる' },
]

export const IDEA_CATEGORY_KEYS = IDEA_CATEGORIES.map((item) => item.key)

export function ideaCategoryLabel(key: string): string {
  return IDEA_CATEGORIES.find((item) => item.key === key)?.label ?? key
}

/** Hook の型(要件28)。 */
export const HOOK_TYPES: Option[] = [
  { key: 'problem', label: 'Problem', description: '悩みを言い当てる' },
  { key: 'question', label: 'Question', description: '問いかける' },
  { key: 'number', label: 'Number', description: '数字で具体化する' },
  { key: 'shock', label: 'Shock', description: '意外な事実を見せる' },
  { key: 'curiosity', label: 'Curiosity', description: '続きが気になる' },
  { key: 'contrarian', label: 'Contrarian', description: '通説の逆を示す' },
  { key: 'secret', label: 'Secret', description: 'プロだけが知る' },
  { key: 'mistake', label: 'Mistake', description: 'よくある間違い' },
  { key: 'example', label: 'Example', description: '具体例から入る' },
]

export const HOOK_TYPE_KEYS = HOOK_TYPES.map((item) => item.key)

/** 出演スタイル(要件29)。 */
export const SCRIPT_STYLES: Option[] = [
  { key: 'face_to_camera', label: 'Face To Camera', description: '人が正面から話す' },
  { key: 'voice_over', label: 'Voice Over', description: '映像＋ナレーション' },
  { key: 'b_roll', label: 'B-roll', description: '映像素材中心' },
  { key: 'interview', label: 'Interview', description: '対話・インタビュー' },
  { key: 'screen_recording', label: 'Screen Recording', description: '画面収録' },
  { key: 'mixed', label: 'Mixed', description: '組み合わせ' },
]

export const SCRIPT_STYLE_KEYS = SCRIPT_STYLES.map((item) => item.key)

/** トーン(要件29)。 */
export const SCRIPT_TONES: Option[] = [
  { key: 'professional', label: 'Professional', description: '落ち着いた専門性' },
  { key: 'friendly', label: 'Friendly', description: '親しみやすい' },
  { key: 'luxury', label: 'Luxury', description: '高級感' },
  { key: 'casual', label: 'Casual', description: '日常の距離感' },
  { key: 'energetic', label: 'Energetic', description: '勢いとテンポ' },
  { key: 'educational', label: 'Educational', description: '解説的' },
  { key: 'emotional', label: 'Emotional', description: '感情に寄り添う' },
]

export const SCRIPT_TONE_KEYS = SCRIPT_TONES.map((item) => item.key)

/** 制作難易度。 */
export const DIFFICULTIES: Option[] = [
  { key: 'LOW', label: 'LOW', description: 'スマホ1台で撮れる' },
  { key: 'MEDIUM', label: 'MEDIUM', description: '準備・段取りが必要' },
  { key: 'HIGH', label: 'HIGH', description: '撮影体制と素材が必要' },
]

export const DIFFICULTY_KEYS = DIFFICULTIES.map((item) => item.key)

/** 調査レポートのセクション(要件19, 80)。 */
export const RESEARCH_SECTIONS = [
  { key: 'overview', label: 'Overview', jaLabel: '要点' },
  { key: 'market', label: 'Market', jaLabel: '市場動向' },
  { key: 'customer', label: 'Customer', jaLabel: '顧客インサイト' },
  { key: 'sns', label: 'SNS', jaLabel: 'SNSインサイト' },
  { key: 'competitor', label: 'Competitors', jaLabel: '競合分析' },
  { key: 'gap', label: 'Content Gap', jaLabel: 'まだ競合が取れていない発信領域' },
  { key: 'opportunity', label: 'Opportunities', jaLabel: '狙うべきテーマ' },
] as const

export type ResearchSectionKey = (typeof RESEARCH_SECTIONS)[number]['key']
export const RESEARCH_SECTION_KEYS: string[] = RESEARCH_SECTIONS.map((section) => section.key)

/** カレンダーの投稿ステータス(要件42)。 */
export const CALENDAR_STATUSES = [
  { key: 'IDEA', label: 'IDEA', tone: 'neutral' },
  { key: 'SCRIPT', label: 'SCRIPT', tone: 'info' },
  { key: 'READY', label: 'READY', tone: 'brand' },
  { key: 'PLANNED', label: 'PLANNED', tone: 'brand' },
  { key: 'POSTED', label: 'POSTED', tone: 'positive' },
  { key: 'ARCHIVED', label: 'ARCHIVED', tone: 'neutral' },
] as const

export const CALENDAR_STATUS_KEYS: string[] = CALENDAR_STATUSES.map((status) => status.key)

export function labelOf(options: Option[], key: string): string {
  return options.find((option) => option.key === key)?.label ?? key
}
