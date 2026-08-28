/**
 * 権限判定の純関数(要件9)。
 * DB・フレームワークへ依存させず、単体テストで固定する。
 */
export type Role = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER'

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
}

export function roleAtLeast(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required]
}

/** 操作ごとの必要ロール。UIの出し分けとサーバー側検証の両方がここを参照する。 */
export const PERMISSIONS = {
  'content.read': 'VIEWER',
  'content.write': 'EDITOR',
  'content.delete': 'EDITOR',
  'research.run': 'EDITOR',
  'ai.generate': 'EDITOR',
  'brand.manage': 'ADMIN',
  'member.invite': 'ADMIN',
  'member.role': 'ADMIN',
  'organization.settings': 'ADMIN',
  'organization.delete': 'OWNER',
} as const satisfies Record<string, Role>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role, permission: Permission): boolean {
  return roleAtLeast(role, PERMISSIONS[permission])
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: '組織のすべてを操作できます(組織の削除を含む)。',
  ADMIN: 'ブランド管理・メンバー管理を含め、組織削除以外を操作できます。',
  EDITOR: '調査・企画・台本の作成と編集ができます。',
  VIEWER: '閲覧のみ可能です。',
}

/** 組織名から一意なスラッグの候補を作る。 */
export function slugify(name: string): string {
  const base = name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'workspace'
}
