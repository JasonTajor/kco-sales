import { useLocation, useNavigate } from 'react-router-dom'
import { EmojiTile } from '@/components/common/EmojiTile'
import { Page } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Page>
      <EmptyState
        icon={<EmojiTile name="notFound" tone="lightblue" size="lg" play="loop" />}
        title="Page not found"
        description={`Nothing lives at ${location.pathname}. It may have been moved or renamed.`}
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        }
      />
    </Page>
  )
}
