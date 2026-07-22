'use client'

import { Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BulkLabelDialog } from '@/components/operations/bulk-label-dialog'
import type { OperationListItem } from '@/hooks/use-operations'

export function OperationsBulkActionBar({
  projectSlug,
  selectedOperations,
  onClearSelection,
}: {
  projectSlug: string
  selectedOperations: OperationListItem[]
  onClearSelection: () => void
}) {
  const count = selectedOperations.length

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4'>
      <div className='pointer-events-auto flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg'>
        <span className='px-2 text-sm font-medium'>{count} selected</span>
        <BulkLabelDialog
          projectSlug={projectSlug}
          selectedOperations={selectedOperations}
        />
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
