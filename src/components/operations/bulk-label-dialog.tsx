'use client'

import { useState } from 'react'
import { Plus, Tag, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLabels, useCreateLabel } from '@/hooks/use-labels'
import {
  useBulkAttachOperationLabel,
  useBulkDetachOperationLabel,
} from '@/hooks/use-bulk-operation-labels'
import type { OperationListItem } from '@/hooks/use-operations'
import { randomLabelColor } from '@/lib/label-color'
import { projectLabelNameSchema } from '@/lib/project-label'

export function BulkLabelDialog({
  projectSlug,
  selectedOperations,
}: {
  projectSlug: string
  selectedOperations: OperationListItem[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingLabelId, setPendingLabelId] = useState<string | null>(null)

  const { labels: projectLabels } = useLabels(projectSlug)
  const createLabel = useCreateLabel(projectSlug)
  const attach = useBulkAttachOperationLabel(projectSlug)
  const detach = useBulkDetachOperationLabel(projectSlug)

  const opNumbers = selectedOperations.map((operation) => operation.number)

  const trimmedQuery = query.trim()
  const filteredLabels = projectLabels.filter((label) =>
    label.name.toLowerCase().includes(trimmedQuery.toLowerCase()),
  )
  const nameValidation =
    trimmedQuery === '' ? null : projectLabelNameSchema.safeParse(trimmedQuery)
  const nameTaken = projectLabels.some(
    (label) => label.name.toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const canCreate =
    nameValidation != null && nameValidation.success && !nameTaken

  const labelState = (labelId: string): boolean | 'indeterminate' => {
    const count = selectedOperations.filter((operation) =>
      operation.labels.some((label) => label.id === labelId),
    ).length
    if (count === 0) {
      return false
    }
    if (count === selectedOperations.length) {
      return true
    }
    return 'indeterminate'
  }

  const handleToggle = async (label: {
    id: string
    name: string
    color: string
  }) => {
    setPendingLabelId(label.id)
    try {
      if (labelState(label.id) === true) {
        await detach.mutateAsync({ labelId: label.id, opNumbers })
      } else {
        await attach.mutateAsync({
          label: { id: label.id, name: label.name, color: label.color },
          opNumbers,
        })
      }
    } finally {
      setPendingLabelId(null)
    }
  }

  const handleCreate = async () => {
    setPendingLabelId('create')
    try {
      const created = await createLabel.mutateAsync({
        name: trimmedQuery,
        color: randomLabelColor(),
      })
      await attach.mutateAsync({
        label: { id: created.id, name: created.name, color: created.color },
        opNumbers,
      })
      setQuery('')
    } finally {
      setPendingLabelId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          <Tag className='size-4' />
          <span className='hidden sm:inline'>Manage labels</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='gap-0 p-0 sm:max-w-sm'>
        <DialogHeader className='px-4 pt-4'>
          <DialogTitle>Manage labels</DialogTitle>
        </DialogHeader>
        <div className='border-b p-3'>
          <Input
            autoFocus
            value={query}
            placeholder='Filter or create…'
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className='max-h-72 overflow-y-auto p-1'>
          {filteredLabels.map((label) => (
            <div
              key={label.id}
              role='button'
              tabIndex={0}
              onClick={() => handleToggle(label)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleToggle(label)
                }
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                pendingLabelId === label.id && 'pointer-events-none opacity-50',
              )}
            >
              <Checkbox
                checked={labelState(label.id)}
                className='pointer-events-none'
              />
              <span
                className='size-3 shrink-0 rounded-full'
                style={{ backgroundColor: label.color }}
              />
              <span className='truncate'>{label.name}</span>
            </div>
          ))}

          {filteredLabels.length === 0 && trimmedQuery === '' ? (
            <div className='px-2 py-3 text-center text-sm text-muted-foreground'>
              No labels
            </div>
          ) : null}

          {nameValidation != null && !nameValidation.success ? (
            <div className='flex items-center gap-2 border-t px-2 py-1.5 text-sm text-destructive'>
              <TriangleAlert className='size-4 shrink-0' />
              <span>{nameValidation.error.issues[0].message}</span>
            </div>
          ) : null}

          {canCreate ? (
            <div className='border-t p-1'>
              <button
                type='button'
                onClick={handleCreate}
                disabled={pendingLabelId === 'create'}
                className='flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50'
              >
                <Plus className='size-4 shrink-0' />
                <span className='truncate'>
                  Create label “
                  <span className='font-medium'>{trimmedQuery}</span>”
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
