'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FuzzyPicker } from '@/components/ui/fuzzy-picker'
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
}: {
  projectSlug: string
  operationNumber: number
  assignees: OperationAssignee[]
}) {
  const { operators } = useOperators(projectSlug)
  const attach = useAttachOperationAssignee(projectSlug, operationNumber)
  const detach = useDetachOperationAssignee(projectSlug, operationNumber)

  const selectedIds = assignees.map((assignee) => assignee.projectOperatorId)
  const options = operators.map((operator) => ({
    id: operator.id,
    label: operator.name,
  }))

  return (
    <FuzzyPicker
      options={options}
      selectedIds={selectedIds}
      onToggle={(option) => {
        if (selectedIds.includes(option.id)) {
          detach.mutate(option.id)
        } else {
          attach.mutate({ projectOperatorId: option.id, name: option.label })
        }
      }}
      placeholder='Assign operator…'
      emptyText='No operators'
      trigger={
        <Button
          variant='ghost'
          size='icon'
          className='size-6 rounded-full border border-dashed text-muted-foreground'
          title='Assign operator'
        >
          <Plus className='size-3' />
        </Button>
      }
    />
  )
}
