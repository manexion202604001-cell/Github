import { describe, expect, it } from 'vitest'
import { can, roleAtLeast, slugify, PERMISSIONS, type Role } from './domain'

describe('roleAtLeast', () => {
  it('上位ロールは下位ロールの条件を満たす', () => {
    expect(roleAtLeast('OWNER', 'ADMIN')).toBe(true)
    expect(roleAtLeast('ADMIN', 'EDITOR')).toBe(true)
    expect(roleAtLeast('EDITOR', 'VIEWER')).toBe(true)
  })

  it('下位ロールは上位ロールの条件を満たさない', () => {
    expect(roleAtLeast('VIEWER', 'EDITOR')).toBe(false)
    expect(roleAtLeast('EDITOR', 'ADMIN')).toBe(false)
    expect(roleAtLeast('ADMIN', 'OWNER')).toBe(false)
  })

  it('同じロールは条件を満たす', () => {
    for (const role of ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'] as Role[]) {
      expect(roleAtLeast(role, role)).toBe(true)
    }
  })
})

describe('can', () => {
  it('Viewer は閲覧のみ(要件9)', () => {
    expect(can('VIEWER', 'content.read')).toBe(true)
    expect(can('VIEWER', 'content.write')).toBe(false)
    expect(can('VIEWER', 'research.run')).toBe(false)
    expect(can('VIEWER', 'ai.generate')).toBe(false)
  })

  it('Editor は調査・企画・台本を作成できるが、ブランド管理はできない', () => {
    expect(can('EDITOR', 'content.write')).toBe(true)
    expect(can('EDITOR', 'research.run')).toBe(true)
    expect(can('EDITOR', 'brand.manage')).toBe(false)
    expect(can('EDITOR', 'member.invite')).toBe(false)
  })

  it('Admin はブランドとメンバーを管理できるが、組織削除はできない', () => {
    expect(can('ADMIN', 'brand.manage')).toBe(true)
    expect(can('ADMIN', 'member.role')).toBe(true)
    expect(can('ADMIN', 'organization.delete')).toBe(false)
  })

  it('Owner はすべて操作できる', () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(can('OWNER', permission)).toBe(true)
    }
  })
})

describe('slugify', () => {
  it('英数字はそのまま、区切りはハイフンにする', () => {
    expect(slugify('Sample Clean Inc.')).toBe('sample-clean-inc')
  })

  it('日本語は保持する', () => {
    expect(slugify('株式会社サンプル')).toBe('株式会社サンプル')
  })

  it('空になる入力にはフォールバックを返す', () => {
    expect(slugify('!!!')).toBe('workspace')
  })
})
