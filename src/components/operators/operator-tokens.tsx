'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOperatorTokens } from '@/hooks/use-operator-tokens'
import { TokenItem } from './token-item'
import { CreateTokenDialog } from './create-token-dialog'

type OperatorTokensProps = {
  projectSlug: string
  operatorId: string
}

export function OperatorTokens({
  projectSlug,
  operatorId,
}: OperatorTokensProps) {
  const { tokens, isLoading } = useOperatorTokens(projectSlug, operatorId)

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold'>API Tokens</h2>
        <CreateTokenDialog projectSlug={projectSlug} operatorId={operatorId}>
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
              projectSlug={projectSlug}
              operatorId={operatorId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
