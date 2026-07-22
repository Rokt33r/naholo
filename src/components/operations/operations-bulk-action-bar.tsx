'use client'

import { Tag, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OperationListItem } from '@/hooks/use-operations'

export function OperationsBulkActionBar({
  selectedOperations,
  onClearSelection,
}: {
  selectedOperations: OperationListItem[]
  onClearSelection: () => void
}) {
  const count = selectedOperations.length

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4'>
      <div className='pointer-events-auto flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg'>
        <span className='px-2 text-sm font-medium'>{count} selected</span>
        <Button variant='outline' size='sm'>
          <Tag className='size-4' />
          <span className='hidden sm:inline'>Manage labels</span>
        </Button>
        <Button variant='outline' size='sm'>
          <Users className='size-4' />
          <span className='hidden sm:inline'>Manage assignees</span>
        </Button>
        <Button
          variant='ghost'
          size='icon'
          onClick={onClearSelection}
          aria-label='Clear selection'
        >
          <X className='size-4' />
        </Button>
      </div>
    </div>
  )
}
