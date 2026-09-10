import { Page, PageHeader } from '@/components/layout/PageHeader'
import { ScriptLibrary } from '@/components/content/ScriptLibrary'

export function PhoneScriptsPage() {
  return (
    <Page>
      <PageHeader
        title="Phone Etiquette"
        description="Openings, structures, and confirmations for live calls - written to be read aloud."
        crumbs={[{ label: 'Sales Resources' }, { label: 'Phone Etiquette' }]}
      />
      <ScriptLibrary channel="phone" materialSlugs={['phone-etiquette', 'sales-call-structure']} />
    </Page>
  )
}
