'use client'

import { Plus } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { LabelFormDialog } from '@/components/labels/label-form-dialog'
import { LabelsManager } from '@/components/labels/labels-manager'
import { Button } from '@/components/ui/button'

export default function LabelsIndexPage() {
  const { projectSlug } = useProjectContext()

  return (
    <>
      <div className='flex'>
        <LabelFormDialog projectSlug={projectSlug}>
          <Button size='sm' variant='secondary' title='New label'>
            <Plus className='size-4' /> New label
          </Button>
        </LabelFormDialog>
      </div>
      <LabelsManager projectSlug={projectSlug} />
    </>
  )
}
