import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'
import { getIssue } from '@/dal/getIssue'
import { listTasks } from '@/dal/listTasks'
import { listNotes } from '@/dal/listNotes'
import { IssueClientPage } from '@/components/issues/issue-client-page'

type Props = {
  params: Promise<{ projectId: string; issueId: string }>
}

export default async function IssuePage({ params }: Props) {
  const user = await getAuthUser()
  const { projectId, issueId } = await params

  if (!user) {
    redirect('/sign-in')
  }

  const issue = await getIssue(issueId)

  if (!issue) {
    redirect(`/app/projects/${projectId}`)
  }

  const [tasks, notes] = await Promise.all([
    listTasks(issueId),
    listNotes(issueId),
  ])

  return <IssueClientPage issue={issue} tasks={tasks} notes={notes} />
}
