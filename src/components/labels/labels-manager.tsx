'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabelBadge } from '@/components/labels/label-badge'
import { LabelFormDialog } from '@/components/labels/label-form-dialog'
import { useLabels, useDeleteLabel, type Label } from '@/hooks/use-labels'

export function LabelsManager({ projectSlug }: { projectSlug: string }) {
  const { labels, isLoading } = useLabels(projectSlug)

  if (isLoading) {
    return (
      <div className='px-4 py-3 text-center text-sm text-muted-foreground'>
        Loading...
      </div>
    )
  }

  if (labels.length === 0) {
    return (
      <div className='px-4 py-3 text-center text-sm text-muted-foreground'>
        No labels in this project
      </div>
    )
  }

  return (
    <div className='flex flex-col divide-y'>
      {labels.map((label) => (
        <LabelRow key={label.id} label={label} projectSlug={projectSlug} />
      ))}
    </div>
  )
}

function LabelRow({
  label,
  projectSlug,
}: {
  label: Label
  projectSlug: string
}) {
  const deleteLabel = useDeleteLabel(projectSlug)

  const handleDelete = () => {
    if (!confirm(`Delete the "${label.name}" label?`)) {
      return
    }
    deleteLabel.mutate(label.id)
  }

  return (
    <div className='flex items-center gap-1 py-2'>
      <LabelBadge name={label.name} color={label.color} />
      <LabelFormDialog projectSlug={projectSlug} label={label}>
        <Button
          variant='ghost'
          size='icon'
          className='size-7'
          title='Edit label'
        >
          <Pencil className='size-4' />
        </Button>
      </LabelFormDialog>
      <Button
        variant='ghost'
        size='icon'
        className='size-7 text-red-600'
        title='Delete label'
        onClick={handleDelete}
      >
        <Trash2 className='size-4' />
      </Button>
    </div>
  )
}
