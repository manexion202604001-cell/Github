import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { courses, lessonAttachments, lessons, sections } from '@/lib/db/schema'
import { createSignedUrl } from '@/lib/storage'

/** LEARN-10: 会員限定の署名付き URL（1 時間）へリダイレクト */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const row = await db
    .select({ att: lessonAttachments, status: courses.status })
    .from(lessonAttachments)
    .innerJoin(lessons, eq(lessons.id, lessonAttachments.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessonAttachments.id, id))
    .then((r) => r[0])
  if (!row || (row.status !== 'published' && !isStaff(user.profile))) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const url = await createSignedUrl('lesson-files', row.att.storagePath)
  if (!url) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  return NextResponse.redirect(url, { status: 302 })
}
