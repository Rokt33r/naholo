import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/server/auth/utils'
import { getIssue } from '@/server/services/issue'
import { listTasks } from '@/server/services/task'
import { listNotes } from '@/server/services/note'
import { IssueClientPage } from '@/components/issues/issue-client-page'

type Props = {
  params: Promise<{ projectId: string; issueId: string }>
}

export default async function IssuePage({ params }: Props) {
  const user = await requireAuthOrRedirect()
  const { projectId, issueId } = await params

  const issueResult = await getIssue(user.id, issueId)

  if (!issueResult.success || !issueResult.data) {
    redirect(`/app/projects/${projectId}`)
  }

  const [tasksResult, notesResult] = await Promise.all([
    listTasks(user.id, issueId),
    listNotes(user.id, issueId),
  ])

  return (
    <IssueClientPage
      issue={issueResult.data}
      tasks={tasksResult.success ? tasksResult.data : []}
      notes={notesResult.success ? notesResult.data : []}
    />
  )
}
