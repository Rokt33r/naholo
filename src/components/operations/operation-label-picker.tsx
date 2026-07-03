'use client'

import type { ReactNode } from 'react'
import { Plus, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FuzzyPicker } from '@/components/ui/fuzzy-picker'
import { useLabels, useCreateLabel } from '@/hooks/use-labels'
import {
  useAttachOperationLabel,
  useDetachOperationLabel,
} from '@/hooks/use-operation-labels'
import type { OperationLabel } from '@/hooks/use-operations'
import { randomLabelColor } from '@/lib/label-color'
import { projectLabelNameSchema } from '@/lib/project-label'

type LabelOption = {
  id: string
  label: string
  color: string
}

export function OperationLabelPicker({
  projectSlug,
  operationNumber,
  labels,
  trigger,
}: {
  projectSlug: string
  operationNumber: number
  labels: OperationLabel[]
  trigger?: ReactNode
}) {
  const { labels: projectLabels } = useLabels(projectSlug)
  const createLabel = useCreateLabel(projectSlug)
  const attach = useAttachOperationLabel(projectSlug, operationNumber)
  const detach = useDetachOperationLabel(projectSlug, operationNumber)

  const selectedIds = labels.map((label) => label.id)
  const options: LabelOption[] = projectLabels.map((label) => ({
    id: label.id,
    label: label.name,
    color: label.color,
  }))

  const handleCreate = async (name: string) => {
    const created = await createLabel.mutateAsync({
      name,
      color: randomLabelColor(),
    })
    attach.mutate({ id: created.id, name: created.name, color: created.color })
  }

  return (
    <FuzzyPicker<LabelOption>
      options={options}
      selectedIds={selectedIds}
      onToggle={(option) => {
        if (selectedIds.includes(option.id)) {
          detach.mutate(option.id)
        } else {
          attach.mutate({
            id: option.id,
            name: option.label,
            color: option.color,
          })
        }
      }}
      placeholder='Filter or create…'
      emptyText='No labels'
      renderOption={(option) => (
        <span className='flex items-center gap-2'>
          <span
            className='size-3 shrink-0 rounded-full'
            style={{ backgroundColor: option.color }}
          />
          <span className='truncate'>{option.label}</span>
        </span>
      )}
      footer={(query) => {
        if (query === '') {
          return null
        }
        const parsed = projectLabelNameSchema.safeParse(query)
        if (!parsed.success) {
          return (
            <div className='flex items-center gap-2 px-2 py-1.5 text-sm text-destructive'>
              <TriangleAlert className='size-4 shrink-0' />
              <span>{parsed.error.issues[0].message}</span>
            </div>
          )
        }
        const alreadyExists = projectLabels.some(
          (label) => label.name.toLowerCase() === query.toLowerCase(),
        )
        if (alreadyExists) {
          return null
        }
        return (
          <button
            type='button'
            onClick={() => handleCreate(query)}
            className='flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground'
          >
            <Plus className='size-4 shrink-0' />
            <span className='truncate'>
              Create label “<span className='font-medium'>{query}</span>”
            </span>
          </button>
        )
      }}
      trigger={
        trigger ?? (
          <Button
            variant='ghost'
            size='icon'
            className='size-6 rounded-full border border-dashed text-muted-foreground'
            title='Add label'
          >
            <Plus className='size-3' />
          </Button>
        )
      }
    />
  )
}
