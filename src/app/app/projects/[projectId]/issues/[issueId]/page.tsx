import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'
import { getIssue, getLogs, getTasks } from '../../../../dal'
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

  const [logs, tasks] = await Promise.all([getLogs(issueId), getTasks(issueId)])

  return <IssueClientPage issue={issue} tasks={tasks} logs={logs} />
}
