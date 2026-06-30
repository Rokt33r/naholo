'use client'

import { Tag, User } from 'lucide-react'
import { LabelBadge } from '@/components/labels/label-badge'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { OperationAssigneePicker } from '@/components/operations/operation-assignee-picker'
import { OperationLabelPicker } from '@/components/operations/operation-label-picker'
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
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pt-1 pb-2'>
      <div className='flex items-center gap-1'>
        <User className='mr-1 size-4 shrink-0 text-muted-foreground' />
        {assignees.map((assignee) => (
          <OperatorAvatar key={assignee.id} name={assignee.name} />
        ))}
        <OperationAssigneePicker
          projectSlug={projectSlug}
          operationNumber={operationNumber}
          assignees={assignees}
        />
      </div>

      <div className='flex flex-wrap items-center gap-1'>
        <Tag className='mr-1 size-4 shrink-0 text-muted-foreground' />
        {labels.map((label) => (
          <LabelBadge key={label.id} name={label.name} color={label.color} />
        ))}
        <OperationLabelPicker
          projectSlug={projectSlug}
          operationNumber={operationNumber}
          labels={labels}
        />
      </div>
    </div>
  )
}
