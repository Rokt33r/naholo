'use client'

import { Plus } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { LabelFormDialog } from '@/components/labels/label-form-dialog'
import { LabelsManager } from '@/components/labels/labels-manager'
import { Button } from '@/components/ui/button'

export default function LabelsIndexPage() {
  const { projectSlug } = useProjectContext()

  return (
    <div className='flex w-full max-w-2xl flex-col gap-4 p-4'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-lg font-semibold tracking-tight'>Labels</h2>
        <LabelFormDialog projectSlug={projectSlug}>
          <Button size='sm' variant='ghost' title='New label'>
            <Plus className='size-4' /> New label
          </Button>
        </LabelFormDialog>
      </div>

      <LabelsManager projectSlug={projectSlug} />
    </div>
  )
}
