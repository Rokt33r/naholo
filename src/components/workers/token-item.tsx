'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRevokeWorkerToken } from '@/hooks/use-worker-tokens'
import type { WorkerToken } from '@/hooks/use-worker-tokens'

type TokenItemProps = {
  token: WorkerToken
  projectSlug: string
  workerId: string
}

export function TokenItem({ token, projectSlug, workerId }: TokenItemProps) {
  const { mutate: revoke, isPending } = useRevokeWorkerToken(
    projectSlug,
    workerId,
  )

  return (
    <div className='flex items-center justify-between rounded-md border px-3 py-2'>
      <div className='min-w-0 flex-1'>
        <div className='text-sm font-medium'>{token.name}</div>
        <div className='text-xs text-muted-foreground'>
          <span className='font-mono'>{token.tokenHint}</span>
          {token.lastUsedAt && (
            <>
              {' '}
              &middot; Last used{' '}
              {new Date(token.lastUsedAt).toLocaleDateString()}
            </>
          )}
        </div>
      </div>
      <Button
        variant='ghost'
        size='icon-sm'
        onClick={() => revoke(token.id)}
        disabled={isPending}
      >
        <Trash2 className='size-4 text-muted-foreground' />
      </Button>
    </div>
  )
}
