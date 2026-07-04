'use client'

import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FuzzyPicker } from '@/components/ui/fuzzy-picker'
import { useProjectContext } from '@/components/app/project-context'
import { useOperators } from '@/hooks/use-operators'
import {
  useAttachOperationAssignee,
  useDetachOperationAssignee,
} from '@/hooks/use-operation-assignees'
import type { OperationAssignee } from '@/hooks/use-operations'

export function OperationAssigneePicker({
  projectSlug,
  operationNumber,
  assignees,
  trigger,
}: {
  projectSlug: string
  operationNumber: number
  assignees: OperationAssignee[]
  trigger?: ReactNode
}) {
  const { currentOperator } = useProjectContext()
  const { operators } = useOperators(projectSlug)
  const attach = useAttachOperationAssignee(projectSlug, operationNumber)
  const detach = useDetachOperationAssignee(projectSlug, operationNumber)

  const selectedIds = assignees.map((assignee) => assignee.projectOperatorId)
  const options = operators.map((operator) => ({
    id: operator.id,
    label:
      operator.id === currentOperator.id
        ? `${operator.callsign} (me)`
        : operator.callsign,
  }))

  return (
    <FuzzyPicker
      options={options}
      selectedIds={selectedIds}
      onToggle={(option) => {
        if (selectedIds.includes(option.id)) {
          detach.mutate(option.id)
          return
        }
        const operator = operators.find((o) => o.id === option.id)
        if (operator == null) {
          return
        }
        attach.mutate({
          projectOperatorId: operator.id,
          name: operator.name,
          callsign: operator.callsign,
        })
      }}
      placeholder='Assign operator…'
      emptyText='No operators'
      alignOffset={8}
      trigger={
        trigger ?? (
          <Button
            variant='ghost'
            size='icon'
            className='size-6 rounded-full border border-dashed text-muted-foreground'
            title='Assign operator'
          >
            <Plus className='size-3' />
          </Button>
        )
      }
    />
  )
}
