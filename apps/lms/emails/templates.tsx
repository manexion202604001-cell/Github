import { Link, Text } from '@react-email/components'
import { EmailLayout, styles } from './Layout'

const app = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100').replace(/\/$/, '')

export function InvitationEmail({ url, invitedBy, expiresAt }: { url: string; invitedBy: string; expiresAt: string }) {
  return (
    <EmailLayout preview="studio N 学習プラットフォームへのご招待">
      <Text style={styles.heading}>studio N 学習プラットフォームへのご招待</Text>
      <Text style={styles.text}>{invitedBy} からご招待をお送りします。下のリンクから登録を完了してください。</Text>
      <Text style={styles.text}><Link href={url} style={styles.link}>{url}</Link></Text>
      <Text style={styles.caption}>このリンクは {expiresAt} まで有効です（1 回限り）。</Text>
    </EmailLayout>
  )
}

export function QaAnsweredEmail({ title, threadId, replierName }: { title: string; threadId: string; replierName: string }) {
  const url = `${app()}/qa/${threadId}`
  return (
    <EmailLayout preview={`「${title}」に公式回答がつきました`}>
      <Text style={styles.heading}>質問に公式回答がつきました</Text>
      <Text style={styles.text}>「{title}」に {replierName} が回答しました。</Text>
      <Text style={styles.text}><Link href={url} style={styles.link}>回答を読む</Link></Text>
    </EmailLayout>
  )
}

export function NewCourseEmail({ title, slug, description }: { title: string; slug: string; description: string | null }) {
  const url = `${app()}/courses/${slug}`
  return (
    <EmailLayout preview={`新しいコース「${title}」が公開されました`}>
      <Text style={styles.heading}>新しいコースが公開されました</Text>
      <Text style={styles.text}>{title}</Text>
      {description && <Text style={styles.text}>{description}</Text>}
      <Text style={styles.text}><Link href={url} style={styles.link}>コースを見る</Link></Text>
    </EmailLayout>
  )
}

export function OfficeHourReminderEmail({
  title,
  when,
  joinUrl,
  id,
  hoursBefore,
}: {
  title: string
  when: string
  joinUrl: string | null
  id: string
  hoursBefore: 24 | 1
}) {
  const url = `${app()}/office-hours/${id}`
  return (
    <EmailLayout preview={`オフィスアワー「${title}」は${hoursBefore === 24 ? '明日' : '1 時間後'}です`}>
      <Text style={styles.heading}>オフィスアワーのご案内</Text>
      <Text style={styles.text}>{title}</Text>
      <Text style={styles.text}>{when}</Text>
      {joinUrl && <Text style={styles.text}><Link href={joinUrl} style={styles.link}>参加リンク</Link></Text>}
      <Text style={styles.text}><Link href={url} style={styles.link}>事前質問・詳細を見る</Link></Text>
    </EmailLayout>
  )
}

export function CertificateIssuedEmail({ courseTitle, verifyCode }: { courseTitle: string; verifyCode: string }) {
  return (
    <EmailLayout preview={`「${courseTitle}」の修了証を発行しました`}>
      <Text style={styles.heading}>修了おめでとうございます</Text>
      <Text style={styles.text}>「{courseTitle}」を修了しました。修了証を発行しています。</Text>
      <Text style={styles.text}><Link href={`${app()}/certificates`} style={styles.link}>修了証を見る</Link></Text>
      <Text style={styles.caption}>検証コード: {verifyCode}</Text>
    </EmailLayout>
  )
}

export function MentionEmail({ fromName, link, excerpt }: { fromName: string; link: string; excerpt: string }) {
  return (
    <EmailLayout preview={`${fromName} があなたをメンションしました`}>
      <Text style={styles.heading}>メンションされました</Text>
      <Text style={styles.text}>{fromName}: {excerpt}</Text>
      <Text style={styles.text}><Link href={`${app()}${link}`} style={styles.link}>投稿を見る</Link></Text>
    </EmailLayout>
  )
}

export function UnansweredAlertEmail({ count }: { count: number }) {
  return (
    <EmailLayout preview={`24 時間以上未回答の質問が ${count} 件あります`}>
      <Text style={styles.heading}>未回答の質問があります</Text>
      <Text style={styles.text}>24 時間以上回答がついていない質問が {count} 件あります。</Text>
      <Text style={styles.text}><Link href={`${app()}/admin/qa`} style={styles.link}>Q&A 管理を開く</Link></Text>
    </EmailLayout>
  )
}

export function WeeklySummaryEmail({
  displayName,
  xp,
  lessons,
  streak,
  nextLessonTitle,
  nextLessonUrl,
}: {
  displayName: string
  xp: number
  lessons: number
  streak: number
  nextLessonTitle: string | null
  nextLessonUrl: string | null
}) {
  return (
    <EmailLayout preview="今週の学習サマリー">
      <Text style={styles.heading}>今週の学習サマリー</Text>
      <Text style={styles.text}>{displayName} さん、今週は {lessons} レッスンを完了し、{xp} XP を獲得しました。連続学習 {streak} 日。</Text>
      {nextLessonTitle && nextLessonUrl && (
        <Text style={styles.text}>続きから: <Link href={nextLessonUrl} style={styles.link}>{nextLessonTitle}</Link></Text>
      )}
    </EmailLayout>
  )
}
