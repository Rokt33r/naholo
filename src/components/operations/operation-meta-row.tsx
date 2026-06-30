'use client'

import { Tag, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LabelBadge } from '@/components/labels/label-badge'
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
          <span key={assignee.id} title={assignee.name}>
            <Avatar className='size-6'>
              <AvatarFallback className='text-[10px]'>
                {getInitials(assignee.name)}
              </AvatarFallback>
            </Avatar>
          </span>
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
