'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LabelBadge } from '@/components/labels/label-badge'
import { LabelColorPicker } from '@/components/labels/label-color-picker'
import {
  useCreateLabel,
  useUpdateLabel,
  type Label as ProjectLabel,
} from '@/hooks/use-labels'
import { LABEL_COLOR_PRESETS, randomLabelColor } from '@/lib/label-color'
import {
  projectLabelColorSchema,
  projectLabelNameSchema,
} from '@/lib/project-label'

/**
 * Create or edit a project label. Pass `label` to edit; omit it to create.
 */
export function LabelFormDialog({
  projectSlug,
  label,
  children,
}: {
  projectSlug: string
  label?: ProjectLabel
  children: React.ReactNode
}) {
  const isEdit = label != null
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState(label?.color ?? LABEL_COLOR_PRESETS[0])
  const { mutateAsync: createLabel, isPending: isCreating } =
    useCreateLabel(projectSlug)
  const { mutateAsync: updateLabel, isPending: isUpdating } =
    useUpdateLabel(projectSlug)
  const isPending = isCreating || isUpdating

  const trimmedName = name.trim()
  const isNameValid = projectLabelNameSchema.safeParse(name).success
  const isColorValid = projectLabelColorSchema.safeParse(color).success
  const canSubmit = isNameValid && isColorValid && !isPending

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setName(label?.name ?? '')
      setColor(label?.color ?? randomLabelColor())
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      return
    }
    if (isEdit) {
      await updateLabel({ labelId: label.id, name: trimmedName, color })
    } else {
      await createLabel({ name: trimmedName, color })
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit label' : 'New label'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update this label’s name and color.'
                : 'Create a label to organize operations in this project.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='label-name'>Name</Label>
              <Input
                id='label-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='bug'
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label>Color</Label>
              <LabelColorPicker value={color} onChange={setColor} />
            </div>
            <div className='space-y-2'>
              <Label>Preview</Label>
              <div>
                <LabelBadge
                  name={trimmedName === '' ? 'label' : trimmedName}
                  color={isColorValid ? color : LABEL_COLOR_PRESETS[0]}
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
            <Button type='submit' disabled={!canSubmit}>
              {isPending
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
