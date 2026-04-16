'use client'

import { useParams, useRouter } from 'next/navigation'
import { Bot, UserPlus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectSwitcher } from '@/components/projects/project-switcher'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useWorkers } from '@/hooks/use-workers'
import { CreateBotWorkerDialog } from './create-bot-worker-dialog'
import { InviteUserWorkerDialog } from './invite-user-worker-dialog'
import { cn } from '@/lib/utils'
import type { Worker } from '@/hooks/use-workers'
import type { Project } from 'naholo-api/types'

type WorkersListProps = {
  projectSlug: string
  projectName: string
  projects: Project[]
}

export function WorkersList({
  projectSlug,
  projectName,
  projects,
}: WorkersListProps) {
  const router = useRouter()
  const params = useParams()
  const currentWorkerId = params.workerId as string | undefined
  const isMobile = useIsMobile()
  const { workers, isLoading } = useWorkers(projectSlug)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between px-2 pt-2 gap-2'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <ProjectSwitcher
          projects={projects}
          currentProjectSlug={projectSlug}
          currentProjectName={projectName}
        />
      </div>

      <div className='flex items-center justify-between px-4 py-3'>
        <h2 className='text-sm font-semibold text-muted-foreground'>Workers</h2>
        <div className='flex items-center gap-1'>
          <InviteUserWorkerDialog projectSlug={projectSlug}>
            <Button size='icon-sm' variant='ghost' title='Invite user'>
              <UserPlus className='h-4 w-4' />
            </Button>
          </InviteUserWorkerDialog>
          <CreateBotWorkerDialog projectSlug={projectSlug}>
            <Button size='icon-sm' variant='ghost' title='Create bot worker'>
              <Bot className='h-4 w-4' />
            </Button>
          </CreateBotWorkerDialog>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : workers.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            No workers in this project
          </div>
        ) : (
          <div>
            {workers.map((worker) => (
              <WorkerItem
                key={worker.id}
                worker={worker}
                isActive={worker.id === currentWorkerId}
                onClick={() =>
                  router.push(
                    `/app/projects/${projectSlug}/workers/${worker.id}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WorkerItem({
  worker,
  isActive,
  onClick,
}: {
  worker: Worker
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent',
        isActive && 'bg-accent',
      )}
      onClick={onClick}
    >
      {worker.type === 'bot' ? (
        <Bot className='size-4 text-muted-foreground' />
      ) : (
        <User className='size-4 text-muted-foreground' />
      )}
      <div className='flex-1 min-w-0'>
        <div className='truncate text-sm font-medium'>{worker.name}</div>
        <div className='text-xs text-muted-foreground'>
          {worker.type} &middot; {worker.role}
        </div>
      </div>
    </button>
  )
}
