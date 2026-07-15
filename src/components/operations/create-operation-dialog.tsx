'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FuzzyPicker } from '@/components/ui/fuzzy-picker'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { LabelBadge } from '@/components/labels/label-badge'
import { useCreateOperation } from '@/hooks/use-operations'
import { useOperators } from '@/hooks/use-operators'
import { useLabels } from '@/hooks/use-labels'

type CreateOperationDialogProps = {
  projectSlug: string
  children: React.ReactNode
  onOperationCreated?: () => void
}

export function CreateOperationDialog({
  projectSlug,
  children,
  onOperationCreated,
}: CreateOperationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])

  const { operators } = useOperators(projectSlug)
  const { labels } = useLabels(projectSlug)

  const createOperation = useCreateOperation(projectSlug)
  const isPending = createOperation.isPending

  const selectedAssignees = operators.filter((operator) =>
    selectedAssigneeIds.includes(operator.id),
  )
  const selectedLabels = labels.filter((label) =>
    selectedLabelIds.includes(label.id),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    createOperation.mutate(
      {
        title: title.trim(),
        assigneeIds: selectedAssigneeIds,
        labelIds: selectedLabelIds,
      },
      {
        onSuccess: (result) => {
          setOpen(false)
          setTitle('')
          setSelectedAssigneeIds([])
          setSelectedLabelIds([])
          onOperationCreated?.()
          router.push(
            `/app/projects/${projectSlug}/operations/${result.number}`,
          )
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Operation</DialogTitle>
            <DialogDescription>
              Create a new operation to track discussions and tasks.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='title'>Title *</Label>
              <Input
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Operation title'
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className='space-y-2'>
              <Label>Assignees</Label>
              <div className='flex flex-wrap items-center gap-2'>
                {selectedAssignees.map((operator) => (
                  <span key={operator.id} className='flex items-center gap-1'>
                    <OperatorAvatar
                      name={operator.callsign}
                      className='size-5'
                    />
                    <span className='text-sm'>{operator.callsign}</span>
                  </span>
                ))}
                <FuzzyPicker
                  options={operators.map((operator) => ({
                    id: operator.id,
                    label: operator.callsign,
                  }))}
                  selectedIds={selectedAssigneeIds}
                  onToggle={(option) =>
                    toggleId(setSelectedAssigneeIds, option.id)
                  }
                  renderOption={(option) => (
                    <span className='flex items-center gap-2'>
                      <OperatorAvatar name={option.label} className='size-5' />
                      {option.label}
                    </span>
                  )}
                  placeholder='Search operators…'
                  emptyText='No operators'
                  trigger={
                    <Button type='button' variant='outline' size='sm'>
                      <Plus className='size-4' />
                      Add
                    </Button>
                  }
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Labels</Label>
              <div className='flex flex-wrap items-center gap-2'>
                {selectedLabels.map((label) => (
                  <LabelBadge
                    key={label.id}
                    name={label.name}
                    color={label.color}
                    size='sm'
                  />
                ))}
                <FuzzyPicker
                  options={labels.map((label) => ({
                    id: label.id,
                    label: label.name,
                    color: label.color,
                  }))}
                  selectedIds={selectedLabelIds}
                  onToggle={(option) =>
                    toggleId(setSelectedLabelIds, option.id)
                  }
                  renderOption={(option) => (
                    <LabelBadge
                      name={option.label}
                      color={option.color}
                      size='sm'
                    />
                  )}
                  placeholder='Search labels…'
                  emptyText='No labels'
                  trigger={
                    <Button type='button' variant='outline' size='sm'>
                      <Plus className='size-4' />
                      Add
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={!title.trim() || isPending}>
              {isPending ? 'Creating...' : 'Create Operation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toggleId(
  setIds: Dispatch<SetStateAction<string[]>>,
  id: string,
): void {
  setIds((prev) =>
    prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
  )
}
