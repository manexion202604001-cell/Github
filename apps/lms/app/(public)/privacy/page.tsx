import { LegalPage } from '@/components/layout/LegalPage'

export const metadata = { title: 'プライバシーポリシー' }

// TODO(decision-#9): 正式な文面に差し替える
export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updated="2026年9月9日（水）">
      <h2>1. 取得する情報</h2>
      <p>メールアドレス、表示名、プロフィール情報、学習の進捗・投稿などの利用状況。</p>
      <h2>2. 利用目的</h2>
      <ul>
        <li>本サービスの提供・運営、学習状況の管理</li>
        <li>お知らせ・通知メールの送信（会員は通知設定で項目ごとに停止できます）</li>
        <li>サービス改善のための統計分析</li>
      </ul>
      <h2>3. 第三者提供</h2>
      <p>法令に基づく場合を除き、本人の同意なく第三者に提供しません。メールアドレスは本人と管理者以外に表示されません。</p>
      <h2>4. 外部サービス</h2>
      <p>認証・データ保管に Supabase、メール送信に Resend、動画配信に YouTube（プライバシー強化モード）を利用しています。</p>
      <h2>5. 退会時の取り扱い</h2>
      <p>退会後、個人情報は匿名化され、投稿は「退会ユーザー」表示で保持されます。</p>
      <h2>6. お問い合わせ</h2>
      <p>本ポリシーに関するお問い合わせは studio N までご連絡ください。</p>
    </LegalPage>
  )
}
