'use client'

import { Tag, Users, X } from 'lucide-react'
import { LabelBadge } from '@/components/labels/label-badge'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { OperationAssigneePicker } from '@/components/operations/operation-assignee-picker'
import { OperationLabelPicker } from '@/components/operations/operation-label-picker'
import { TasksList } from '@/components/tasks/tasks-list'
import { useDetachOperationAssignee } from '@/hooks/use-operation-assignees'
import { useDetachOperationLabel } from '@/hooks/use-operation-labels'
import type { OperationAssignee, OperationLabel } from '@/hooks/use-operations'

/**
 * The operation side view: GitHub-style assignees and labels sections stacked
 * above the tasks list. Rendered by both the wide-screen side panel and the
 * mobile side-panel dialog so the two surfaces stay identical.
 */
export function OperationSidePanel({
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
  const detachAssignee = useDetachOperationAssignee(
    projectSlug,
    operationNumber,
  )
  const detachLabel = useDetachOperationLabel(projectSlug, operationNumber)

  return (
    <div className='flex h-full flex-col py-1'>
      <section className='px-3'>
        <OperationAssigneePicker
          projectSlug={projectSlug}
          operationNumber={operationNumber}
          assignees={assignees}
          trigger={
            <button
              type='button'
              className='flex w-full items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
            >
              <Users className='size-4' />
              Assignees
            </button>
          }
        />
        <div className='flex flex-wrap items-center gap-1.5'>
          {assignees.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No one assigned</p>
          ) : (
            assignees.map((assignee) => (
              <span
                key={assignee.id}
                className='flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-1 text-sm'
              >
                <OperatorAvatar name={assignee.name} />
                <span className='truncate'>{assignee.name}</span>
                <button
                  type='button'
                  aria-label={`Remove ${assignee.name}`}
                  onClick={() =>
                    detachAssignee.mutate(assignee.projectOperatorId)
                  }
                  className='flex items-center self-stretch rounded-full px-1 opacity-70 hover:opacity-100'
                >
                  <X className='size-3' />
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      <section className='px-3 mt-2'>
        <OperationLabelPicker
          projectSlug={projectSlug}
          operationNumber={operationNumber}
          labels={labels}
          trigger={
            <button
              type='button'
              className='flex w-full items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
            >
              <Tag className='size-4' />
              Labels
            </button>
          }
        />
        <div className='flex flex-wrap items-center gap-1.5'>
          {labels.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No labels</p>
          ) : (
            labels.map((label) => (
              <LabelBadge
                key={label.id}
                name={label.name}
                color={label.color}
                onRemove={() => detachLabel.mutate(label.id)}
              />
            ))
          )}
        </div>
      </section>

      <div className='min-h-0 flex-1 overflow-hidden mt-2'>
        <TasksList
          projectSlug={projectSlug}
          operationNumber={operationNumber}
        />
      </div>
    </div>
  )
}
