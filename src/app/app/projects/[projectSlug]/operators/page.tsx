'use client'

import { Contact, UserPlus } from 'lucide-react'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { InviteList } from '@/components/operators/invite-list'
import { InviteUserOperatorDialog } from '@/components/operators/invite-user-operator-dialog'
import { OperatorsList } from '@/components/operators/operators-list'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-is-mobile'

export default function OperatorsIndexPage() {
  const { projectSlug } = useProjectContext()
  const isMobile = useIsMobile()

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-8 p-6'>
      <section className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
            <Contact className='size-5' />
            <h2 className='text-lg font-semibold'>Operators</h2>
          </div>
          <InviteUserOperatorDialog projectSlug={projectSlug}>
            <Button size='sm' variant='ghost' title='Invite user'>
              <UserPlus className='size-5' /> Invite
            </Button>
          </InviteUserOperatorDialog>
        </div>
        <div className='flex max-h-[28rem] flex-col rounded-lg border'>
          <OperatorsList projectSlug={projectSlug} />
        </div>
        <InviteList projectSlug={projectSlug} />
      </section>
    </div>
  )
}
