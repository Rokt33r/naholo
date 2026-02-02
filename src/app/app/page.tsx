import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/server/auth/utils'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { Button } from '@/components/ui/button'
import { listProjects } from '@/server/services/project'

export default async function AppPage() {
  const user = await requireAuthOrRedirect()

  const result = await listProjects(user.id)

  // Redirect to first project or show empty state
  if (result.success && result.data.length > 0) {
    redirect(`/app/projects/${result.data[0].id}`)
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
