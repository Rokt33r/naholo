'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkerTokens } from '@/hooks/use-worker-tokens'
import { TokenItem } from './token-item'
import { CreateTokenDialog } from './create-token-dialog'

type WorkerTokensProps = {
  projectId: string
  workerId: string
}

export function WorkerTokens({ projectId, workerId }: WorkerTokensProps) {
  const { tokens, isLoading } = useWorkerTokens(projectId, workerId)

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold'>API Tokens</h2>
        <CreateTokenDialog projectId={projectId} workerId={workerId}>
          <Button variant='ghost' size='icon-sm'>
            <Plus className='size-4' />
          </Button>
        </CreateTokenDialog>
      </div>

      {isLoading ? (
        <div className='text-sm text-muted-foreground'>Loading...</div>
      ) : tokens.length === 0 ? (
        <div className='text-sm text-muted-foreground'>
          No API tokens yet. Create one to authenticate API requests.
        </div>
      ) : (
        <div className='space-y-2'>
          {tokens.map((token) => (
            <TokenItem
              key={token.id}
              token={token}
              projectId={projectId}
              workerId={workerId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
