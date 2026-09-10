import { useNavigate } from 'react-router-dom'
import { EmojiTile } from '@/components/common/EmojiTile'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-full items-center justify-center px-gutter py-16">
      <div className="max-w-[420px] text-center">
        <div className="mb-group flex justify-center">
          <EmojiTile name="locked" tone="locked" size="lg" play="loop" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">You do not have access to this page</h1>
        <p className="mt-tight text-base text-fg-secondary">
          This area is limited to administrators. If you think you should have access, ask your training lead.
        </p>
        <div className="mt-group flex items-center justify-center gap-tight">
          <Button variant="primary" size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Return to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
