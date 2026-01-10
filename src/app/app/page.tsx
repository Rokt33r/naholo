import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { Button } from '@/components/ui/button'
import { listProjects } from '../../dal/listProjects'

export default async function AppPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/sign-in')
  }

  const projects = await listProjects()

  // Redirect to first project or show empty state
  if (projects.length > 0) {
    redirect(`/app/projects/${projects[0].id}`)
  }

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
          Welcome to naholo
        </h1>
        <p className='mt-2 text-zinc-600 dark:text-zinc-400'>
          Create your first project to get started
        </p>
        <div className='mt-4'>
          <CreateProjectDialog>
            <Button>Create Project</Button>
          </CreateProjectDialog>
        </div>
      </div>
    </div>
  )
}
