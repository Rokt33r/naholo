'use client'

import { Plus, Tag } from 'lucide-react'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { LabelFormDialog } from '@/components/labels/label-form-dialog'
import { LabelsManager } from '@/components/labels/labels-manager'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-is-mobile'

export default function LabelsIndexPage() {
  const { projectSlug } = useProjectContext()
  const isMobile = useIsMobile()

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-2 px-2 pt-2 h-10'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <h2 className='flex flex-1 items-center gap-2 px-2 font-semibold'>
          <Tag className='size-4' />
          Project labels
        </h2>
        <LabelFormDialog projectSlug={projectSlug}>
          <Button size='sm' variant='ghost' title='New label'>
            <Plus className='size-4' /> New label
          </Button>
        </LabelFormDialog>
      </div>

      <div className='flex-1 overflow-y-auto'>
        <div className='flex w-full max-w-2xl flex-col p-4'>
          <LabelsManager projectSlug={projectSlug} />
        </div>
      </div>
    </div>
  )
}
