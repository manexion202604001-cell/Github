import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

/**
 * 開発用のデモデータ(要件99〜101)。
 * 架空企業「株式会社サンプルクリーン」を作り、調査 → 企画 → 台本 までを一通り体験できる状態にする。
 * 出典URLは example.com のデモドメインのみを使い、実在サイトを事実として提示しない(要件111)。
 */
const db = new PrismaClient()

const DEMO_EMAIL = 'demo@example.com'
const DEMO_PASSWORD = 'demo-password-2026'

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, name: 'デモ担当者', passwordHash, jobTitle: 'マーケティング担当', onboardedAt: new Date() },
    update: { passwordHash },
  })

  const organization = await db.organization.upsert({
    where: { slug: 'sample-clean' },
    create: { name: '株式会社サンプルクリーン', slug: 'sample-clean', createdById: user.id },
    update: {},
  })

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    create: { organizationId: organization.id, userId: user.id, role: 'OWNER', joinedAt: new Date() },
    update: { role: 'OWNER', joinedAt: new Date() },
  })

  // 何度実行しても同じ状態になるよう、既存のデモブランドは作り直す。
  const existing = await db.brand.findFirst({ where: { organizationId: organization.id, name: 'サンプルクリーン' } })
  if (existing) await db.brand.delete({ where: { id: existing.id } })

  const brand = await db.brand.create({
    data: {
      organizationId: organization.id,
      name: 'サンプルクリーン',
      industry: 'エアコンクリーニング',
      website: 'https://example.com',
      region: '東京都内',
      description: '東京都内で家庭向けのエアコン分解洗浄を行う清掃事業者。作業内容の可視化を強みにしている。',
      targetCustomer: '東京都内在住・30〜50代のファミリー層。共働きで時間がなく、品質の判断基準を持てていない。',
      brandTone: '誠実・落ち着いた専門性',
      snsChannels: ['instagram_reels', 'tiktok', 'youtube_shorts'],
      snsGoals: ['inquiry', 'awareness', 'branding'],
      brandKeywords: ['エアコンクリーニング', '分解洗浄', 'カビ対策', '東京'],
      additionalContext: '繁忙期は5〜8月。作業前後の写真を必ず共有する運用にしている。',
      products: {
        create: {
          name: 'エアコン内部クリーニング(分解洗浄)',
          description: '内部を分解し、熱交換器・送風ファンまで洗浄するサービス。',
          priceRange: '12,000円〜20,000円',
          strengths: ['分解洗浄に対応', '作業前後の写真を共有', '当日の追加費用なし'],
          weaknesses: ['繁忙期は予約が取りにくい', '価格は相場よりやや高め'],
          differentiation: '作業の中身と判断基準を、依頼前に文章と写真で説明する。',
          customerProblems: ['掃除の効果が分からない', '料金の内訳が不透明', '業者選びの基準がない'],
          customerNeeds: ['安心して任せたい', '効果を確認したい'],
          purchaseReasons: ['作業内容が具体的に見えた', '担当者の説明に納得できた'],
        },
      },
      rules: {
        create: {
          prohibitedWords: ['絶対に', '必ず治る', '100%', '業界No.1'],
          preferredWords: ['判断の基準', '作業の中身', '確認できます'],
          tone: '誠実・落ち着いた専門性',
          allowCompetitorNames: false,
          avoidExpressions: ['他社を貶める比較', '過度な不安の煽り'],
          regulatoryNotes: '健康被害・除菌効果に関する断定的な表現は使用しない。',
          internalRules: '価格は税込表記。作業範囲を必ず明記する。',
          preferredCta: 'プロフィールから相談できます',
        },
      },
      competitors: {
        create: [
          {
            name: 'デモ競合A社',
            website: 'https://example.com/competitor-a',
            instagramUrl: 'https://example.com/competitor-a-instagram',
            notes: '価格訴求が中心。ビフォーアフター投稿が多く、判断基準の解説は少ない。',
          },
          {
            name: 'デモ競合B社',
            website: 'https://example.com/competitor-b',
            notes: '法人向けが中心。家庭向けの発信は手薄。',
          },
        ],
      },
    },
    include: { products: true },
  })

  // ── 調査(完了済み)────────────────────────────────────────────
  const research = await db.researchRun.create({
    data: {
      organizationId: organization.id,
      brandId: brand.id,
      title: 'エアコンクリーニング市場調査',
      channel: 'instagram_reels',
      region: '東京都内',
      objective: 'sns_plan',
      depth: 'STANDARD',
      status: 'COMPLETED',
      keywords: ['エアコンクリーニング', 'カビ', '相場'],
      freeText: '30〜50代ファミリー向けに、何を発信すべきかを整理したい。',
      summary:
        '東京都内のエアコンクリーニング市場では、価格よりも「作業品質が見えないこと」への不安が意思決定の壁になっている。SNSでは作業内容の可視化と、判断基準を示すコンテンツに機会がある。(デモデータ)',
      createdById: user.id,
      completedAt: new Date(),
      sources: {
        create: [
          {
            title: '【デモデータ】ハウスクリーニング市場の動向',
            url: 'https://example.com/demo/market-overview',
            domain: 'example.com',
            snippet: 'デモ用のサンプル出典です。検索Providerを設定すると、実際の検索結果に置き換わります。',
            searchQuery: 'エアコンクリーニング 市場動向',
            position: 1,
          },
          {
            title: '【デモデータ】利用者アンケートの要約',
            url: 'https://example.com/demo/customer-voice',
            domain: 'example.com',
            snippet: 'デモ用のサンプル出典です。顧客の悩みと比較検討の観点をまとめた記事を想定しています。',
            searchQuery: 'エアコンクリーニング 悩み',
            position: 2,
          },
          {
            title: '【デモデータ】ショート動画のトレンド解説',
            url: 'https://example.com/demo/sns-trend',
            domain: 'example.com',
            snippet: 'デモ用のサンプル出典です。SNSでの発信テーマの傾向をまとめた記事を想定しています。',
            searchQuery: 'エアコン掃除 ショート動画',
            position: 3,
          },
        ],
      },
    },
    include: { sources: true },
  })

  const sourceIds = research.sources.map((source) => source.id)

  await db.researchInsight.createMany({
    data: [
      {
        researchId: research.id,
        category: 'overview',
        title: '不安の正体は「見えないこと」',
        content: '顧客は作業品質を事前に判断できず、比較の軸を持てていない。作業内容を可視化する発信が信頼形成に直結する。(デモデータ)',
        insightType: 'INSIGHT',
        confidence: 72,
        sourceIds: sourceIds.slice(0, 2),
        position: 0,
      },
      {
        researchId: research.id,
        category: 'overview',
        title: '検索行動は「相場」と「失敗例」に集中',
        content: '検討段階では価格相場と失敗事例が繰り返し検索されている。(デモデータ)',
        insightType: 'FACT',
        confidence: 65,
        sourceIds: sourceIds.slice(0, 1),
        position: 1,
      },
      {
        researchId: research.id,
        category: 'overview',
        title: '競合はビフォーアフターに偏っている',
        content: '競合の発信はビフォーアフターに集中し、選び方や判断基準の解説は手薄。(デモデータ)',
        insightType: 'INSIGHT',
        confidence: 66,
        sourceIds: sourceIds.slice(2, 3),
        position: 2,
      },
      {
        researchId: research.id,
        category: 'market',
        title: '需要には明確な季節性がある',
        content: '5〜8月に需要が集中する。繁忙期の1〜2か月前から発信を始める設計が有効な可能性がある。(デモデータ)',
        insightType: 'HYPOTHESIS',
        confidence: 50,
        sourceIds: [],
        position: 3,
      },
      {
        researchId: research.id,
        category: 'customer',
        title: '比較しているのは価格ではなく「安心材料」',
        content: '複数社を比較する際、価格差より作業範囲と保証の明確さを見ている。(デモデータ)',
        insightType: 'INSIGHT',
        confidence: 68,
        sourceIds: sourceIds.slice(1, 2),
        position: 4,
      },
      {
        researchId: research.id,
        category: 'sns',
        title: '発信すべきはHowToと判断基準',
        content: 'HowTo・比較・失敗例の3テーマが、検討層の不安に直接答える。(デモデータ)',
        insightType: 'INSIGHT',
        confidence: 70,
        sourceIds: sourceIds.slice(2, 3),
        position: 5,
      },
      {
        researchId: research.id,
        category: 'competitor',
        title: 'デモ競合A社',
        content: '価格訴求を中心に据えた事業者。投稿頻度は高いが、判断基準の解説は行っていない。(デモデータ)',
        insightType: 'INSIGHT',
        confidence: 60,
        sourceIds: [],
        metaJson: {
          url: 'https://example.com/competitor-a',
          themes: ['ビフォーアフター', 'キャンペーン告知'],
          strengths: ['投稿頻度が高い'],
          weaknesses: ['判断基準の解説が無い', '専門性が伝わりにくい'],
          differentiationRoom: '「選び方」と「作業の中身」を体系的に解説する余地がある。',
        },
        position: 6,
      },
      {
        researchId: research.id,
        category: 'gap',
        title: '作業前後の「判断プロセス」',
        content: 'プロが現場で何を見て判断しているかを解説する発信は、競合にほぼ無い。(デモデータ)',
        insightType: 'INSIGHT',
        confidence: 62,
        sourceIds: [],
        position: 7,
      },
      {
        researchId: research.id,
        category: 'opportunity',
        title: 'プロの判断基準を見せる',
        content: '現場で最初に確認する箇所を実演し、判断の理由まで説明する。',
        insightType: 'INSIGHT',
        confidence: 70,
        sourceIds: [],
        metaJson: { whyNow: '検討層の不安が「見えないこと」に集中しているため。' },
        position: 8,
      },
      {
        researchId: research.id,
        category: 'opportunity',
        title: '失敗例から入る比較コンテンツ',
        content: 'よくある失敗を提示し、回避のための確認項目を示す。',
        insightType: 'INSIGHT',
        confidence: 66,
        sourceIds: [],
        metaJson: { whyNow: '失敗例の検索需要が継続的にあるため。' },
        position: 9,
      },
    ],
  })

  // ── 企画(要件101のデモ企画)──────────────────────────────────
  const demoIdeas = [
    {
      title: 'エアコン掃除、フィルターだけで終わっていませんか？',
      category: 'problem',
      hook: 'エアコン掃除、フィルターだけで終わっていませんか？',
      summary: 'フィルター清掃だけでは届かない内部の汚れを示し、どこまで確認すべきかを解説する。',
      whyThisIdea: '検討層の不安が「効果が分からないこと」に集中しているため、範囲の違いを見せることが判断材料になる。',
      difficulty: 'LOW',
      overall: 92,
      hookScore: 95,
    },
    {
      title: '3年間掃除していないエアコン内部',
      category: 'before_after',
      hook: '3年間掃除していないエアコンの中、こうなっています。',
      summary: '実際の内部状態を見せ、放置による変化を段階的に説明する。',
      whyThisIdea: '視覚的な変化は保存・共有されやすく、相談のきっかけになりやすい。',
      difficulty: 'MEDIUM',
      overall: 89,
      hookScore: 92,
    },
    {
      title: 'プロがエアコン掃除で最初に見る場所',
      category: 'expert',
      hook: '実はプロでも最初に見る場所があります。',
      summary: '現場で最初に確認する箇所と、その理由を解説する。',
      whyThisIdea: '競合が発信していない「判断プロセス」の領域で、専門性を示せる。',
      difficulty: 'LOW',
      overall: 87,
      hookScore: 90,
    },
  ]

  const createdIdeas = []
  for (const demo of demoIdeas) {
    const idea = await db.idea.create({
      data: {
        organizationId: organization.id,
        brandId: brand.id,
        researchId: research.id,
        title: demo.title,
        category: demo.category,
        channel: 'instagram_reels',
        objective: 'inquiry',
        hook: demo.hook,
        summary: demo.summary,
        whyThisIdea: demo.whyThisIdea,
        target: '東京都内在住・30〜50代のファミリー層',
        cta: 'プロフィールから相談できます',
        durationSec: 30,
        difficulty: demo.difficulty,
        createdById: user.id,
        isFavorite: demo.overall >= 90,
        score: {
          create: {
            overall: demo.overall,
            hook: demo.hookScore,
            relevance: 88,
            differentiation: 92,
            shareability: 84,
            saveability: 87,
            conversion: 80,
            brandFit: 90,
            feasibility: demo.difficulty === 'LOW' ? 92 : 76,
            brandSafety: 95,
            reasoning: '判断基準を示す構成でHookが具体的。制作難易度も現実的。(デモデータの推定評価)',
          },
        },
      },
    })
    createdIdeas.push(idea)
  }

  // ── 台本(先頭の企画から)────────────────────────────────────
  const leadIdea = createdIdeas[0]
  if (leadIdea) {
    await db.script.create({
      data: {
        organizationId: organization.id,
        brandId: brand.id,
        ideaId: leadIdea.id,
        title: leadIdea.title,
        channel: 'instagram_reels',
        durationSec: 30,
        style: 'face_to_camera',
        tone: 'friendly',
        hook: leadIdea.hook,
        cta: 'プロフィールから相談できます',
        status: 'READY',
        createdById: user.id,
        scenes: {
          create: [
            {
              position: 0,
              startSecond: 0,
              endSecond: 4,
              visual: 'エアコン内部の汚れのアップ。フィルターを外した直後の状態。',
              voice: 'エアコン掃除、フィルターだけで終わっていませんか？',
              onscreenText: 'フィルターだけ？',
              camera: 'マクロ寄り / ゆっくりプッシュイン',
              assets: ['エアコン本体'],
              purpose: 'Hook',
            },
            {
              position: 1,
              startSecond: 4,
              endSecond: 11,
              visual: '話者がカメラ目線で説明。手元でフィルターと内部を交互に指し示す。',
              voice: '実は汚れの多くは、フィルターの奥にたまります。',
              onscreenText: '汚れは奥にある',
              camera: '手持ちミディアム',
              assets: ['話者', 'フィルター'],
              purpose: 'Problem',
            },
            {
              position: 2,
              startSecond: 11,
              endSecond: 21,
              visual: '内部の熱交換器と送風ファンを順に映す。確認手順を実演。',
              voice: '確認するのは3か所だけ。順番に見ていきます。',
              onscreenText: '確認は3か所',
              camera: '手元アップ / 引きの切り返し',
              assets: ['ライト', 'エアコン内部'],
              purpose: 'Solution',
            },
            {
              position: 3,
              startSecond: 21,
              endSecond: 26,
              visual: '洗浄前後の同一アングル比較。',
              voice: '同じ場所でも、どこまで見るかで結果が変わります。',
              onscreenText: '見る範囲で変わる',
              camera: '固定 / 同一画角',
              assets: ['比較素材'],
              purpose: 'Proof',
            },
            {
              position: 4,
              startSecond: 26,
              endSecond: 30,
              visual: '話者のバストショット。最後にCTAのテロップ。',
              voice: '気になる方はプロフィールからご相談ください。',
              onscreenText: 'プロフィールへ',
              camera: '手持ちバストショット',
              assets: ['話者'],
              purpose: 'CTA',
            },
          ],
        },
      },
    })
  }

  console.log('デモデータを作成しました。')
  console.log(`  ログイン: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`  組織: ${organization.name} / ブランド: ${brand.name}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
