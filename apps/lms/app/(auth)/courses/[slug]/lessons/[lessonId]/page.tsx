import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { requireUser, isStaff } from '@/lib/auth'
import { getCourseOutline, getLessonView } from '@/lib/db/queries/learn'
import { createSignedUrl } from '@/lib/storage'
import { isLessonUnlocked } from '@/lib/xp'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Markdown } from '@/components/ui/Markdown'
import { Button } from '@/components/ui/Button'
import { VideoPlayer } from '@/components/learn/VideoPlayer'
import { SlideViewer } from '@/components/learn/SlideViewer'
import { QuizPlayer } from '@/components/learn/QuizPlayer'
import { CompleteButton } from '@/components/learn/CompleteButton'
import { LessonNotes } from '@/components/learn/LessonNotes'
import { LessonToc } from '@/components/learn/LessonToc'
import { AttachmentList } from '@/components/learn/AttachmentList'

export const metadata = { title: 'レッスン' }

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const user = await requireUser()
  const { slug, lessonId } = await params
  const staff = isStaff(user.profile)
  const outline = await getCourseOutline(slug, user.id, staff)
  if (!outline) notFound()
  const idx = outline.lessonOrder.indexOf(lessonId)
  if (idx < 0) notFound()
  if (!staff && !isLessonUnlocked(outline.course.isSequential, outline.lessonOrder, lessonId, outline.completed)) {
    redirect(`/courses/${slug}`)
  }
  const view = await getLessonView(lessonId, user.id)
  if (!view) notFound()
  const { lesson } = view
  const prevId = outline.lessonOrder[idx - 1] ?? null
  const nextId = outline.lessonOrder[idx + 1] ?? null
  const slideUrl = lesson.type === 'slide' && lesson.slideUrl ? await createSignedUrl('lesson-files', lesson.slideUrl) : null
  const attachments = await Promise.all(
    view.attachments.map(async (a) => ({ ...a, url: null as string | null })),
  )

  return (
    <div className="-mx-4 -mt-8 md:-mx-8 md:-mt-12 lg:mx-0 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <div className="min-w-0">
        {/* メディア（モバイルは画面上部に固定） */}
        <div className="sticky top-16 z-10 bg-ink-900 lg:static lg:rounded lg:border lg:border-dark">
          <div className="mx-auto w-full max-w-[960px]">
            {lesson.type === 'video' && lesson.youtubeVideoId && (
              <VideoPlayer lessonId={lesson.id} videoId={lesson.youtubeVideoId} startSec={view.lastPositionSec} completed={view.completed} />
            )}
            {lesson.type === 'slide' && (slideUrl ? <SlideViewer lessonId={lesson.id} url={slideUrl} completed={view.completed} /> : <div className="flex aspect-video items-center justify-center text-paper-100/70">スライドが未登録です。</div>)}
            {lesson.type === 'text' && <div className="hidden lg:block lg:h-2" />}
            {lesson.type === 'quiz' && <div className="hidden lg:block lg:h-2" />}
          </div>
        </div>

        <div className="px-4 py-6 md:px-8 lg:px-0">
          <p className="caption mb-1">
            <Link href={`/courses/${slug}`} className="no-underline hover:text-bronze-500">{outline.course.title}</Link>
          </p>
          <h1 className="text-[24px] md:text-[28px]">{lesson.title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {lesson.type !== 'quiz' && <CompleteButton lessonId={lesson.id} completed={view.completed} nextHref={nextId ? `/courses/${slug}/lessons/${nextId}` : `/courses/${slug}`} />}
            {lesson.type === 'quiz' && view.completed && (
              <span className="inline-flex items-center gap-1.5 font-sans text-[13px] tracking-[0.06em] text-bronze-500"><Check className="size-4 stroke-[1.5]" />合格済み</span>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" asChild disabled={!prevId}>
                {prevId ? <Link href={`/courses/${slug}/lessons/${prevId}`}><ChevronLeft />前</Link> : <span aria-disabled className="opacity-40"><ChevronLeft />前</span>}
              </Button>
              <Button variant="outline" size="sm" asChild>
                {nextId ? <Link href={`/courses/${slug}/lessons/${nextId}`}>次<ChevronRight /></Link> : <Link href={`/courses/${slug}`}>コースへ戻る</Link>}
              </Button>
            </div>
          </div>

          {lesson.type === 'text' && lesson.bodyMd && (
            <div className="mt-8">
              <Markdown>{lesson.bodyMd}</Markdown>
            </div>
          )}
          {lesson.type === 'quiz' && (
            <div className="mt-8">
              {view.quiz ? <QuizPlayer quiz={view.quiz} completed={view.completed} nextHref={nextId ? `/courses/${slug}/lessons/${nextId}` : `/courses/${slug}`} /> : <p className="text-stone-500">小テストは準備中です。</p>}
            </div>
          )}

          <Tabs defaultValue={lesson.type === 'text' ? 'files' : 'about'} className="mt-10">
            <TabsList>
              {lesson.type !== 'text' && <TabsTrigger value="about">説明</TabsTrigger>}
              <TabsTrigger value="files">資料</TabsTrigger>
              <TabsTrigger value="notes">メモ</TabsTrigger>
            </TabsList>
            {lesson.type !== 'text' && (
              <TabsContent value="about">
                {lesson.bodyMd ? <Markdown>{lesson.bodyMd}</Markdown> : <p className="text-[15px] text-stone-500">このレッスンに説明はありません。</p>}
              </TabsContent>
            )}
            <TabsContent value="files">
              <AttachmentList attachments={attachments} />
            </TabsContent>
            <TabsContent value="notes">
              <LessonNotes lessonId={lesson.id} initial={view.note} />
            </TabsContent>
          </Tabs>

          <p className="caption mt-10">
            分からないことは <Link href={`/qa/new?course=${outline.course.id}&lesson=${lesson.id}`}>講師に質問</Link> できます。
          </p>

          <div className="mt-10 lg:hidden">
            <LessonToc slug={slug} sections={outline.sections} completed={[...outline.completed]} currentId={lesson.id} progress={outline.progress} lessonOrder={outline.lessonOrder} isSequential={outline.course.isSequential && !staff} collapsible />
          </div>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <LessonToc slug={slug} sections={outline.sections} completed={[...outline.completed]} currentId={lesson.id} progress={outline.progress} lessonOrder={outline.lessonOrder} isSequential={outline.course.isSequential && !staff} />
        </div>
      </aside>
    </div>
  )
}
