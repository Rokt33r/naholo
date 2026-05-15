// TEMPORARY — remove after agent-session transcript migration (OP #145) is verified in prod.
import { requireAppAdmin } from '@/server/auth/permissions'
import { AgentSessionTranscriptsMigrationClient } from './client'

export default async function AgentSessionTranscriptsMigrationPage() {
  await requireAppAdmin()
  return <AgentSessionTranscriptsMigrationClient />
}
