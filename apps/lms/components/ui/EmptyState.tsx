import Link from 'next/link'
import { Button } from './Button'

export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="font-serif text-ink-700">{message}</p>
      {action && (
        <Button variant="ghost" asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
