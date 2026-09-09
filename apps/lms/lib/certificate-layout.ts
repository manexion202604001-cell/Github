/**
 * 修了証の文面・保存パス（純粋関数。テスト対象）
 * REQUIREMENTS.md §5.6 GAME-04
 */

export type CertificateTextInput = {
  recipientName: string
  courseTitle: string
  issuedAt: Date | string
  verifyCode: string
  verifyUrl: string
  /** 日本語フォントが使えない場合は false（英字のみのレイアウト） */
  japanese: boolean
}

export type CertificateText = {
  eyebrow: string
  title: string
  recipient: string
  statement: string
  course: string
  dateLine: string
  codeLine: string
  verifyLine: string
  issuer: string
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

function jst(input: Date | string) {
  const d = typeof input === 'string' ? new Date(input) : input
  const t = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() }
}

/** JST で `2026年9月9日` 形式（曜日なし。修了証向け） */
export function formatCertificateDateJa(input: Date | string): string {
  const { year, month, day } = jst(input)
  return `${year}年${month}月${day}日`
}

/** JST で `September 9, 2026` 形式 */
export function formatCertificateDateEn(input: Date | string): string {
  const { year, month, day } = jst(input)
  return `${MONTHS_EN[month - 1]} ${day}, ${year}`
}

/** Storage `certificates` バケット内のパス */
export function certificateStoragePath(userId: string, certificateId: string): string {
  return `${userId}/${certificateId}.pdf`
}

/** ダウンロード時のファイル名（ASCII のみ。Content-Disposition の filename 用） */
export function certificateFileName(verifyCode: string): string {
  const safe = verifyCode.replace(/[^A-Za-z0-9-]/g, '')
  return `certificate-${safe || 'studio-n'}.pdf`
}

/** PDF に載せる文面を組み立てる（日本語 / 英字のみ） */
export function buildCertificateText(input: CertificateTextInput): CertificateText {
  if (input.japanese) {
    return {
      eyebrow: 'CERTIFICATE OF COMPLETION',
      title: '修了証',
      recipient: `${input.recipientName} 殿`,
      statement: 'あなたは studio N 学習プラットフォームにおいて、下記のコースを修了したことをここに証します。',
      course: input.courseTitle,
      dateLine: `発行日 ${formatCertificateDateJa(input.issuedAt)}`,
      codeLine: `検証コード ${input.verifyCode}`,
      verifyLine: input.verifyUrl,
      issuer: 'studio N',
    }
  }
  return {
    eyebrow: 'CERTIFICATE OF COMPLETION',
    title: 'Certificate of Completion',
    recipient: input.recipientName,
    statement: 'This certifies that the above named has successfully completed the following course on the studio N learning platform.',
    course: input.courseTitle,
    dateLine: `Issued on ${formatCertificateDateEn(input.issuedAt)}`,
    codeLine: `Verification code ${input.verifyCode}`,
    verifyLine: input.verifyUrl,
    issuer: 'studio N',
  }
}
