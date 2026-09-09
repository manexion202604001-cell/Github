import { expect, test } from '@playwright/test'

test.describe('公開ページ', () => {
  test('ランディングからログインへ導線がある', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('学び合う')
    await page.getByRole('link', { name: '会員の方はログイン' }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
  })

  test('会員ページは未ログインだとログインへリダイレクトされる', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/)
  })

  test('無効な招待トークンは登録できない', async ({ page }) => {
    await page.goto('/signup?token=invalid-token-xxxxxxxx')
    await expect(page.getByText('この招待リンクは無効か、有効期限が切れています。')).toBeVisible()
  })

  test('存在しない検証コードは修了証なしと表示される', async ({ page }) => {
    await page.goto('/verify/SN-2026-ZZZZZZ')
    await expect(page.getByText('該当する修了証はありません')).toBeVisible()
  })

  test('利用規約・プライバシーポリシーが表示される', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: '利用規約' })).toBeVisible()
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'プライバシーポリシー' })).toBeVisible()
  })
})
