'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { LabelBadge } from '@/components/labels/label-badge'
import { LabelFormDialog } from '@/components/labels/label-form-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDeleteLabel, useLabels, type Label } from '@/hooks/use-labels'

export default function LabelsIndexPage() {
  const { projectSlug } = useProjectContext()
  const { labels, isLoading } = useLabels(projectSlug)

  return (
    <Card>
      <CardContent>
        <div className='mb-4'>
          <LabelFormDialog projectSlug={projectSlug}>
            <Button size='sm' variant='outline' title='New label'>
              <Plus className='size-4' /> New label
            </Button>
          </LabelFormDialog>
        </div>

        {isLoading ? (
          <div className='text-muted-foreground py-3 text-center text-sm'>
            Loading...
          </div>
        ) : labels.length === 0 ? (
          <div className='text-muted-foreground py-3 text-center text-sm'>
            No labels in this project
          </div>
        ) : (
          <div className='flex flex-col divide-y'>
            {labels.map((label) => (
              <LabelRow
                key={label.id}
                label={label}
                projectSlug={projectSlug}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
    <div className='flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0'>
      <LabelBadge name={label.name} color={label.color} />
      <div className='flex items-center gap-1'>
        <LabelFormDialog projectSlug={projectSlug} label={label}>
          <Button
            variant='ghost'
            size='icon'
            className='text-muted-foreground size-7'
            title='Edit label'
          >
            <Pencil className='size-4' />
          </Button>
        </LabelFormDialog>
        <Button
          variant='ghost-destructive'
          size='icon'
          className='size-7'
          title='Delete label'
          onClick={handleDelete}
        >
          <Trash2 className='size-4' />
        </Button>
      </div>
    </div>
  )
}
