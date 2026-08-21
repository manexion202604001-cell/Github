/**
 * 開発用シードデータ。`npm run db:seed`
 * デモユーザー1名 + 組織 + サンプルプロジェクトを作成する。
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main(): Promise<void> {
  const email = 'demo@manexion.local'
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    console.log('seed: demo user already exists, skipping')
    return
  }

  const user = await db.user.create({
    data: {
      email,
      name: 'デモユーザー',
      passwordHash: await bcrypt.hash('demo-password-123', 12),
      emailVerifiedAt: new Date(),
    },
  })

  const organization = await db.organization.create({
    data: {
      name: 'MANEXION デモ',
      slug: 'manexion-demo',
      members: { create: { userId: user.id, role: 'OWNER', joinedAt: new Date() } },
    },
  })

  await db.project.create({
    data: {
      organizationId: organization.id,
      name: '折りたたみ衣類乾燥機',
      createdBy: user.id,
      stage: 'IDEA',
      product: {
        create: {
          name: '折りたたみ衣類乾燥機',
          category: '衣類乾燥機',
          rawInput: '一人暮らし向けの折りたたみ衣類乾燥機。収納しやすさを最優先にしたい。想定価格は6,000円前後。',
          description: '一人暮らし向けの折りたたみ衣類乾燥機。収納しやすさを最優先。',
          price: 5980,
          channel: 'Amazon.co.jp',
          country: '日本',
          features: ['折りたたみ収納', '静音'],
          usp: ['収納時の高さ150mm'],
        },
      },
    },
  })

  console.log('seed: created demo user (demo@manexion.local / demo-password-123)')
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => void db.$disconnect())
