import { Page, PageHeader } from '@/components/layout/PageHeader'
import { ScriptLibrary } from '@/components/content/ScriptLibrary'

export function ChatScriptsPage() {
  return (
    <Page>
      <PageHeader
        title="Chat Etiquette"
        description="Messenger and page replies - the wording that keeps a thread moving without sounding like a bot."
        crumbs={[{ label: 'Sales Resources' }, { label: 'Chat Etiquette' }]}
      />
      <ScriptLibrary channel="chat" materialSlugs={['chat-etiquette', 'kco-chat-formula']} />
    </Page>
  )
}
