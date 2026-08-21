import { NewProjectForm } from './new-project-form'

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">新しい商品プロジェクト</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        まだ細かく決まっていなくて構いません。AIが不足している情報を質問しながら企画を組み立てます。
      </p>
      <div className="mt-6">
        <NewProjectForm />
      </div>
    </div>
  )
}
