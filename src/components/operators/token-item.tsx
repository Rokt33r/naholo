'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRevokeOperatorToken } from '@/hooks/use-operator-tokens'
import type { OperatorToken } from '@/hooks/use-operator-tokens'

type TokenItemProps = {
  token: OperatorToken
  projectSlug: string
  operatorId: string
}

export function TokenItem({ token, projectSlug, operatorId }: TokenItemProps) {
  const { mutate: revoke, isPending } = useRevokeOperatorToken(
    projectSlug,
    operatorId,
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
