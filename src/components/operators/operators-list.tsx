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
      {operators.map((operator) => (
        <OperatorCard
          key={operator.id}
          operator={operator}
          canRemove={isAdmin}
          onRemove={() => handleRemove(operator)}
        />
      ))}
    </div>
  )
}

function OperatorCard({
  operator,
  canRemove,
  onRemove,
}: {
  operator: Operator
  canRemove: boolean
  onRemove: () => void
}) {
  return (
    <div className='flex w-full items-center gap-3 rounded-lg border px-4 py-3'>
      <User className='size-4 text-muted-foreground' />
      <div className='flex-1 min-w-0'>
        <div className='truncate text-sm font-medium'>{operator.name}</div>
        <div className='text-xs text-muted-foreground'>{operator.role}</div>
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
