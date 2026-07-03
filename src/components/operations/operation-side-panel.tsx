'use client'

import { type KeyboardEvent } from 'react'
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
 *
 * The whole assignees/labels block is the picker trigger — clicking anywhere in
 * a section opens its picker. The chips/badges stop propagation so they stay
 * inert (they become filter links to another op in later work).
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
      <OperationAssigneePicker
        projectSlug={projectSlug}
        operationNumber={operationNumber}
        assignees={assignees}
        trigger={
          <div
            role='button'
            tabIndex={0}
            onKeyDown={handleSectionTriggerKeyDown}
            className='group px-3 pb-1 outline-none'
          >
            <div className='flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground'>
              <Users className='size-4' />
              Assignees
            </div>
            <div className='flex flex-wrap items-center gap-1.5'>
              {assignees.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No one assigned</p>
              ) : (
                assignees.map((assignee) => (
                  <span
                    key={assignee.id}
                    onClick={(event) => event.stopPropagation()}
                    className='flex cursor-default items-center gap-1.5 rounded-full border py-1 pl-1 pr-1 text-sm'
                  >
                    <OperatorAvatar name={assignee.name} />
                    <span className='truncate'>{assignee.name}</span>
                    <button
                      type='button'
                      aria-label={`Remove ${assignee.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        detachAssignee.mutate(assignee.projectOperatorId)
                      }}
                      className='flex items-center self-stretch rounded-full px-1 opacity-70 hover:opacity-100'
                    >
                      <X className='size-3' />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        }
      />

      <OperationLabelPicker
        projectSlug={projectSlug}
        operationNumber={operationNumber}
        labels={labels}
        trigger={
          <div
            role='button'
            tabIndex={0}
            onKeyDown={handleSectionTriggerKeyDown}
            className='group mt-2 px-3 pb-1 outline-none'
          >
            <div className='flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground'>
              <Tag className='size-4' />
              Labels
            </div>
            <div className='flex flex-wrap items-center gap-1.5'>
              {labels.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No labels</p>
              ) : (
                labels.map((label) => (
                  <span
                    key={label.id}
                    onClick={(event) => event.stopPropagation()}
                    className='inline-flex cursor-default'
                  >
                    <LabelBadge
                      name={label.name}
                      color={label.color}
                      onRemove={() => detachLabel.mutate(label.id)}
                    />
                  </span>
                ))
              )}
            </div>
          </div>
        }
      />

      <div className='mt-2 min-h-0 flex-1 overflow-hidden'>
        <TasksList
          projectSlug={projectSlug}
          operationNumber={operationNumber}
        />
      </div>
    </div>
  )
}

// The section trigger is a role=button div (it nests the chip/remove buttons, so
// it can't be a native <button>); mirror native button keyboard activation.
function handleSectionTriggerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.currentTarget.click()
  }
}
