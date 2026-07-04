'use client'

import { User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectContext } from '@/components/app/project-context'
import { useOperators, useRemoveProjectOperator } from '@/hooks/use-operators'
import type { Operator } from '@/hooks/use-operators'

type OperatorsListProps = {
  projectSlug: string
}

export function OperatorsList({ projectSlug }: OperatorsListProps) {
  const { currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'
  const { operators, isLoading } = useOperators(projectSlug)
  const removeOperator = useRemoveProjectOperator(projectSlug)

  const handleRemove = (operator: Operator) => {
    if (
      !confirm(
        `Remove ${operator.name} from this project? They will lose access immediately.`,
      )
    ) {
      return
    }
    removeOperator.mutate(operator.id)
  }

  if (isLoading) {
    return (
      <div className='px-4 py-3 text-center text-sm text-muted-foreground'>
        Loading...
      </div>
    )
  }

  if (operators.length === 0) {
    return (
      <div className='px-4 py-3 text-center text-sm text-muted-foreground'>
        No operators in this project
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <h3 className='text-sm font-medium'>Operator list</h3>
      {operators.map((operator) => (
        <OperatorCard
          key={operator.id}
          operator={operator}
          isSelf={operator.id === currentOperator.id}
          canRemove={isAdmin}
          onRemove={() => handleRemove(operator)}
        />
      ))}
    </div>
  )
}

function OperatorCard({
  operator,
  isSelf,
  canRemove,
  onRemove,
}: {
  operator: Operator
  isSelf: boolean
  canRemove: boolean
  onRemove: () => void
}) {
  return (
    <div className='flex w-full items-center gap-3 rounded-lg border px-4 py-3'>
      <User className='size-4 text-muted-foreground' />
      <div className='flex-1 min-w-0'>
        <div className='flex min-w-0 items-baseline gap-1.5'>
          <span className='w-16 shrink-0 text-xs text-muted-foreground'>
            Name
          </span>
          <span className='truncate text-sm font-medium'>{operator.name}</span>
          {isSelf && (
            <span className='shrink-0 text-xs text-muted-foreground'>(me)</span>
          )}
        </div>
        <div className='flex min-w-0 items-baseline gap-1.5'>
          <span className='w-16 shrink-0 text-xs text-muted-foreground'>
            Callsign
          </span>
          <span className='truncate text-sm'>{operator.callsign}</span>
        </div>
        <div className='flex min-w-0 items-baseline gap-1.5'>
          <span className='w-16 shrink-0 text-xs text-muted-foreground'>
            Role
          </span>
          <span className='truncate text-sm'>{operator.role}</span>
        </div>
      </div>
      {canRemove && (
        <Button
          variant='ghost'
          size='icon'
          className='size-7 text-red-600'
          title='Remove operator'
          onClick={onRemove}
        >
          <Trash2 className='size-4' />
        </Button>
      )}
    </div>
  )
}
