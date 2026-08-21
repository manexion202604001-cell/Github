import { notFound } from 'next/navigation'
import { getProject } from '@/features/projects/service'
import { STAGE_LABEL } from '@/features/projects/schema'
import { AppError } from '@/lib/errors'
import { Badge } from '@/components/ui/badge'
import { ProjectNav } from './project-nav'
import { AssistantPanel } from '@/components/assistant/assistant-panel'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  let project
  try {
    project = await getProject(projectId)
  } catch (error) {
    if (error instanceof AppError && (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')) notFound()
    throw error
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-bold">{project.name}</h1>
          <Badge tone="brand">{STAGE_LABEL[project.stage]}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ProjectNav projectId={projectId} />
        <div className="min-w-0 pb-24">{children}</div>
      </div>

      <AssistantPanel projectId={projectId} />
    </div>
  )
}
