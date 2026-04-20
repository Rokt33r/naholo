'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectContext } from '@/components/app/project-context'
import { EditWorkerSoulForm } from '@/components/workers/edit-worker-soul-form'
import { WorkerTokens } from '@/components/workers/worker-tokens'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useWorker } from '@/hooks/use-workers'

export default function OperatorDetailPage() {
  const { projectSlug } = useProjectContext()
  const { operatorId } = useParams<{ operatorId: string }>()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { worker, isLoading } = useWorker(projectSlug, operatorId)

  return (
    <div className='flex h-full flex-col'>
      {isMobile && (
        <div className='flex items-center gap-2 px-4 pt-3 pb-1'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() =>
              router.push(`/app/projects/${projectSlug}/operators`)
            }
          >
            <ArrowLeft className='size-4' />
          </Button>
        </div>
      )}
      <div className='flex-1 overflow-y-auto'>
        {isLoading ? (
          <div className='p-6 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : worker == null ? (
          <div className='p-6 text-center text-sm text-muted-foreground'>
            Operator not found
          </div>
        ) : (
          <div className='space-y-6 p-6'>
            <div className='flex items-center gap-3'>
              {worker.type === 'bot' ? (
                <Bot className='size-5 text-muted-foreground' />
              ) : (
                <User className='size-5 text-muted-foreground' />
              )}
              <div>
                <h1 className='text-lg font-semibold'>{worker.name}</h1>
                <p className='text-sm text-muted-foreground'>
                  {worker.type} &middot; {worker.role}
                </p>
              </div>
            </div>

            {worker.type === 'bot' && (
              <div className='border-t pt-6'>
                <EditWorkerSoulForm
                  projectSlug={projectSlug}
                  workerId={operatorId}
                  soul={worker.soul}
                />
              </div>
            )}

            <div className='border-t pt-6'>
              <WorkerTokens projectSlug={projectSlug} workerId={operatorId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
