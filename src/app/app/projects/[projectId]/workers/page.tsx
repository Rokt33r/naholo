'use client'

import { useRouter } from 'next/navigation'
import { Bot, User } from 'lucide-react'
import { ProjectSwitcher } from '@/components/projects/project-switcher'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useWorkers } from '@/hooks/use-workers'
import type { Worker } from '@/hooks/use-workers'

export default function WorkersPage() {
  const { projectId, projectName, projects } = useProjectContext()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { workers, isLoading } = useWorkers(projectId)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between px-4 pt-2 gap-2'>
        {isMobile && <AppModeMenu currentProjectId={projectId} />}
        <ProjectSwitcher
          projects={projects}
          currentProjectId={projectId}
          currentProjectName={projectName}
        />
      </div>

      <div className='px-4 py-3'>
        <h2 className='text-sm font-semibold text-muted-foreground'>Workers</h2>
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
                onClick={() =>
                  router.push(`/app/projects/${projectId}/workers/${worker.id}`)
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
  onClick,
}: {
  worker: Worker
  onClick: () => void
}) {
  return (
    <button
      className='flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent'
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
