'use client'

import { Contact, UserPlus, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useOperators, useRemoveProjectOperator } from '@/hooks/use-operators'
import { InviteUserOperatorDialog } from './invite-user-operator-dialog'
import type { Operator } from '@/hooks/use-operators'

type OperatorsListProps = {
  projectSlug: string
}

export function OperatorsList({ projectSlug }: OperatorsListProps) {
  const isMobile = useIsMobile()
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

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between gap-2 px-2 pt-2'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <h2 className='flex flex-1 items-center gap-2 px-2 font-semibold'>
          <Contact className='size-5' />
          Operators
        </h2>
        <div className='flex items-center gap-1'>
          <InviteUserOperatorDialog projectSlug={projectSlug}>
            <Button size='sm' variant='ghost' title='Invite user'>
              <UserPlus className='h-4 w-4' /> Invite
            </Button>
          </InviteUserOperatorDialog>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-2 py-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : operators.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            No operators in this project
          </div>
        ) : (
          <div>
            {operators.map((operator) => (
              <OperatorItem
                key={operator.id}
                operator={operator}
                canRemove={isAdmin}
                onRemove={() => handleRemove(operator)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OperatorItem({
  operator,
  canRemove,
  onRemove,
}: {
  operator: Operator
  canRemove: boolean
  onRemove: () => void
}) {
  return (
    <div className='flex w-full items-center gap-3 rounded-md px-2 py-2 text-left'>
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
          <Trash2 className='size-5' />
        </Button>
      )}
    </div>
  )
}
