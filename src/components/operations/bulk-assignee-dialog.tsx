'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { useOperators } from '@/hooks/use-operators'
import {
  useBulkAssignOperator,
  useBulkUnassignOperator,
} from '@/hooks/use-bulk-operation-assignees'
import type { OperationListItem } from '@/hooks/use-operations'

export function BulkAssigneeDialog({
  projectSlug,
  selectedOperations,
}: {
  projectSlug: string
  selectedOperations: OperationListItem[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingOperatorId, setPendingOperatorId] = useState<string | null>(
    null,
  )

  const { operators } = useOperators(projectSlug)
  const assign = useBulkAssignOperator(projectSlug)
  const unassign = useBulkUnassignOperator(projectSlug)

  const opNumbers = selectedOperations.map((operation) => operation.number)

  const trimmedQuery = query.trim().toLowerCase()
  const filteredOperators = operators.filter(
    (operator) =>
      operator.name.toLowerCase().includes(trimmedQuery) ||
      operator.callsign.toLowerCase().includes(trimmedQuery),
  )

  const operatorState = (operatorId: string): boolean | 'indeterminate' => {
    const count = selectedOperations.filter((operation) =>
      operation.assignees.some(
        (assignee) => assignee.projectOperatorId === operatorId,
      ),
    ).length
    if (count === 0) {
      return false
    }
    if (count === selectedOperations.length) {
      return true
    }
    return 'indeterminate'
  }

  const handleToggle = async (operator: {
    id: string
    name: string
    callsign: string
  }) => {
    setPendingOperatorId(operator.id)
    try {
      if (operatorState(operator.id) === true) {
        await unassign.mutateAsync({
          projectOperatorId: operator.id,
          opNumbers,
        })
      } else {
        await assign.mutateAsync({
          operator: {
            projectOperatorId: operator.id,
            name: operator.name,
            callsign: operator.callsign,
          },
          opNumbers,
        })
      }
    } finally {
      setPendingOperatorId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          <Users className='size-4' />
          <span className='hidden sm:inline'>Manage assignees</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='gap-0 p-0 sm:max-w-sm'>
        <DialogHeader className='px-4 pt-4'>
          <DialogTitle>Manage assignees</DialogTitle>
        </DialogHeader>
        <div className='border-b p-3'>
          <Input
            autoFocus
            value={query}
            placeholder='Filter assignees…'
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className='max-h-72 overflow-y-auto p-1'>
          {filteredOperators.length === 0 ? (
            <div className='px-2 py-3 text-center text-sm text-muted-foreground'>
              No operators
            </div>
          ) : (
            filteredOperators.map((operator) => (
              <button
                key={operator.id}
                type='button'
                onClick={() => handleToggle(operator)}
                disabled={pendingOperatorId === operator.id}
                className='flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50'
              >
                <Checkbox
                  checked={operatorState(operator.id)}
                  className='pointer-events-none'
                />
                <OperatorAvatar name={operator.callsign} className='size-5' />
                <span className='truncate'>{operator.name}</span>
                <span className='truncate text-xs text-muted-foreground'>
                  {operator.callsign}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
