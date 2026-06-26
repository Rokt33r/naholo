import Link from 'next/link'
import { requireAuthUser } from '@/server/auth/permissions'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/auth/logout-button'
import { listProjects } from '@/server/services/project'

export default async function AppPage() {
  const user = await requireAuthUser({
    allowedAuthMethods: ['session'],
    redirectUrlOnFail: '/sign-in',
  })

  const projects = await listProjects(user.id)

  if (projects.length === 0) {
    return (
      <div className='flex h-full items-center justify-center pt-12'>
        <div className='text-center'>
          <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
            Welcome to naholo
          </h1>
          <p className='mt-2 text-zinc-600 dark:text-zinc-400'>
            Create your first project to get started
          </p>
          <div className='mt-4'>
            <CreateProjectDialog>
              <Button>Create project</Button>
            </CreateProjectDialog>
          </div>
          <div className='mt-4'>
            <LogoutButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pt-12'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
          Your projects
        </h1>
        <CreateProjectDialog>
          <Button>New project</Button>
        </CreateProjectDialog>
      </div>
      <ul className='flex flex-col gap-2'>
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/app/projects/${project.slug}`}
              className='hover:bg-accent flex flex-col gap-1 rounded-lg border p-4 transition-colors'
            >
              <span className='font-medium text-zinc-900 dark:text-zinc-50'>
                {project.name}
              </span>
              {project.description != null && (
                <span className='text-muted-foreground text-sm'>
                  {project.description}
                </span>
              )}
              <span className='text-muted-foreground text-xs'>
                {project.slug}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className='flex border-t pt-6'>
        <LogoutButton />
      </div>
    </div>
  )
}
