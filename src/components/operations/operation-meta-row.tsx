'use client'

import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabelBadge } from '@/components/labels/label-badge'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { OperationMetaDialog } from '@/components/operations/operation-meta-dialog'
import type { OperationAssignee, OperationLabel } from '@/hooks/use-operations'

export function OperationMetaRow({
  projectSlug,
  operationNumber,
  labels,
  assignees,
}: {
  projectSlug: string
  operationNumber: number
  labels: OperationLabel[]
  assignees: OperationAssignee[]
}) {
  const isEmpty = assignees.length === 0 && labels.length === 0

  return (
    <div className='flex flex-wrap items-center gap-x-1 gap-y-1 px-2 py-1'>
      {!isEmpty && (
        <div className='flex flex-wrap items-center gap-1'>
          {assignees.map((assignee) => (
            <OperatorAvatar key={assignee.id} name={assignee.name} />
          ))}
          {labels.map((label) => (
            <LabelBadge key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}
      <OperationMetaDialog
        projectSlug={projectSlug}
        operationNumber={operationNumber}
        labels={labels}
        assignees={assignees}
      >
        {isEmpty ? (
          <Button
            variant='ghost'
            className='flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground'
          >
            <Pencil className='size-4' />
            Add assignees or labels
          </Button>
        ) : (
          <Button
            variant='ghost'
            size='icon'
            className='size-6 rounded-full text-muted-foreground'
            title='Edit assignees and labels'
          >
            <Pencil className='size-3' />
          </Button>
        )}
      </OperationMetaDialog>
    </div>
  )
}
