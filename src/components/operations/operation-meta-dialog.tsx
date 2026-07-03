'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LabelBadge } from '@/components/labels/label-badge'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { OperationAssigneePicker } from '@/components/operations/operation-assignee-picker'
import { OperationLabelPicker } from '@/components/operations/operation-label-picker'
import { useDetachOperationAssignee } from '@/hooks/use-operation-assignees'
import { useDetachOperationLabel } from '@/hooks/use-operation-labels'
import type { OperationAssignee, OperationLabel } from '@/hooks/use-operations'

/**
 * Edit an operation's assignees and labels in one dialog. The trigger is passed
 * in as `children` (à la `LabelFormDialog`).
 */
export function OperationMetaDialog({
  projectSlug,
  operationNumber,
  labels,
  assignees,
  children,
}: {
  projectSlug: string
  operationNumber: number
  labels: OperationLabel[]
  assignees: OperationAssignee[]
  children: React.ReactNode
}) {
  const detachAssignee = useDetachOperationAssignee(
    projectSlug,
    operationNumber,
  )
  const detachLabel = useDetachOperationLabel(projectSlug, operationNumber)

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Operation metadata</DialogTitle>
          <DialogDescription>
            Assign operators and apply labels to this operation.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Assignees</h3>
            <div className='flex flex-wrap items-center gap-2'>
              {assignees.map((assignee) => (
                <span
                  key={assignee.id}
                  className='flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-sm'
                >
                  <OperatorAvatar name={assignee.name} />
                  <span className='truncate'>{assignee.name}</span>
                  <button
                    type='button'
                    aria-label={`Remove ${assignee.name}`}
                    onClick={() =>
                      detachAssignee.mutate(assignee.projectOperatorId)
                    }
                    className='rounded-full opacity-70 hover:opacity-100'
                  >
                    <X className='size-3' />
                  </button>
                </span>
              ))}
              <OperationAssigneePicker
                projectSlug={projectSlug}
                operationNumber={operationNumber}
                assignees={assignees}
              />
            </div>
          </section>

          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Labels</h3>
            <div className='flex flex-wrap items-center gap-2'>
              {labels.map((label) => (
                <LabelBadge
                  key={label.id}
                  name={label.name}
                  color={label.color}
                  onRemove={() => detachLabel.mutate(label.id)}
                />
              ))}
              <OperationLabelPicker
                projectSlug={projectSlug}
                operationNumber={operationNumber}
                labels={labels}
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
