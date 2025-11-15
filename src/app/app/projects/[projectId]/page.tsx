import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'
import { getProject, getIssues } from '../../dal'

type Props = {
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: Props) {
  const user = await getAuthUser()
  const { projectId } = await params

  if (!user) {
    redirect('/sign-in')
  }

  const project = await getProject(projectId)

  if (!project) {
    redirect('/app')
  }

  const issues = await getIssues(projectId) // Show open issues by default

  // Redirect to first issue or show empty state
  if (issues.length > 0) {
    redirect(`/app/projects/${projectId}/issues/${issues[0].id}`)
  }

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
          No issues yet
        </h1>
        <p className='mt-2 text-zinc-600 dark:text-zinc-400'>
          Create your first issue to get started
        </p>
        {/* TODO: Add create issue button */}
      </div>
    </div>
  )
}
