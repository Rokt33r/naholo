import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/server/auth/utils'
import { getIssue } from '@/server/services/issue'
import { listNotes } from '@/server/services/note'
import { IssueClientPage } from '@/components/issues/issue-client-page'

type Props = {
  params: Promise<{ projectId: string; issueId: string }>
}

export default async function IssuePage({ params }: Props) {
  const user = await requireAuthOrRedirect()
  const { projectId, issueId } = await params

  const issue = await getIssue(user.id, issueId)

  if (!issue) {
    redirect(`/app/projects/${projectId}`)
  }

  const notes = await listNotes(user.id, issueId)

  return <IssueClientPage issue={issue} notes={notes} />
}
