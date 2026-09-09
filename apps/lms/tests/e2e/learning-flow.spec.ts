import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.describe('招待 → 登録 → 受講 → 完了 → 修了証', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD が未設定')

  const stamp = Date.now()
  const studentEmail = `e2e-student-${stamp}@example.com`
  const studentPassword = `Pass-${stamp}!`
  const courseTitle = `E2E コース ${stamp}`

  async function login(page: Page, email: string, password: string) {
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByLabel('パスワード').fill(password)
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  }

  test('フルフロー', async ({ browser }) => {
    test.setTimeout(180_000)
    // --- 管理者: コース作成・公開 ---
    const adminCtx = await browser.newContext()
    const admin = await adminCtx.newPage()
    await login(admin, ADMIN_EMAIL!, ADMIN_PASSWORD!)

    await admin.goto('/admin/courses/new')
    await admin.getByLabel('タイトル').fill(courseTitle)
    await admin.getByRole('button', { name: /作成|保存/ }).first().click()
    await expect(admin).toHaveURL(/\/admin\/courses\/[0-9a-f-]+/)

    // セクション + テキストレッスン
    await admin.getByPlaceholder(/セクション/).first().fill('第1週')
    await admin.getByRole('button', { name: /セクションを追加/ }).click()
    await expect(admin.getByText('第1週')).toBeVisible()
    await admin.getByRole('button', { name: /レッスンを追加/ }).first().click()
    const lessonTitle = admin.getByLabel(/レッスン.*タイトル|タイトル/).last()
    await lessonTitle.fill('はじめに')
    await admin.getByRole('button', { name: /追加|保存/ }).last().click()
    await expect(admin.getByText('はじめに')).toBeVisible()

    // 公開
    await admin.getByRole('button', { name: /公開する|公開/ }).first().click()
    await expect(admin.getByText(/公開中|published|公開しました/)).toBeVisible()

    // --- 管理者: 招待発行 ---
    await admin.goto('/admin/members')
    await admin.getByLabel(/メールアドレス/).first().fill(studentEmail)
    await admin.getByRole('button', { name: /招待を送る|招待/ }).first().click()
    const inviteLink = await admin.locator(`text=/signup\\?token=/`).first().textContent()
    const tokenMatch = inviteLink?.match(/token=([\w-]+)/)
    expect(tokenMatch).not.toBeNull()
    const token = tokenMatch![1]
    await adminCtx.close()

    // --- 受講生: 登録 ---
    const studentCtx = await browser.newContext()
    const student = await studentCtx.newPage()
    await student.goto(`/signup?token=${token}`)
    await student.getByLabel('表示名').fill('E2E 受講生')
    await student.getByLabel('パスワード', { exact: true }).fill(studentPassword)
    await student.getByRole('button', { name: '登録する' }).click()
    await expect(student).toHaveURL(/\/dashboard/)

    // --- 受講 → 完了 ---
    await student.goto('/courses')
    await student.getByRole('link', { name: new RegExp(courseTitle) }).click()
    await student.getByRole('button', { name: '受講を開始' }).click()
    await expect(student).toHaveURL(/\/lessons\//)
    await student.getByRole('button', { name: '完了にする' }).click()
    await expect(student.getByText(/コースを修了しました|レッスンを完了しました/)).toBeVisible()

    // --- 修了証 ---
    await student.goto('/certificates')
    await expect(student.getByText(courseTitle)).toBeVisible()
    const code = await student.locator('text=/SN-\\d{4}-[A-Z2-9]{6}/').first().textContent()
    const verify = code!.match(/SN-\d{4}-[A-Z2-9]{6}/)![0]
    await studentCtx.close()

    // --- 公開検証ページ ---
    const anon = await (await browser.newContext()).newPage()
    await anon.goto(`/verify/${verify}`)
    await expect(anon.getByText(courseTitle)).toBeVisible()
    await expect(anon.getByText('E2E 受講生')).toBeVisible()
  })
})
