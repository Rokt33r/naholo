'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, User, Terminal, CreditCard } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { ProjectSettingsTab } from '@/components/settings/project-settings-tab'
import { UserSettingsTab } from '@/components/settings/user-settings-tab'
import { CliInstallTab } from '@/components/settings/cli-install-tab'
import { BillingTab } from '@/components/settings/billing-tab'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'
  const defaultTab = isAdmin ? 'project' : 'user'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[min(480px,80vh)] sm:max-w-2xl'>
        <DialogTitle className='sr-only'>Settings</DialogTitle>
        <Tabs
          defaultValue={defaultTab}
          orientation='vertical'
          className='h-full overflow-hidden'
        >
          <TabsList className='w-[160px] shrink-0'>
            {isAdmin && (
              <TabsTrigger value='project'>
                <Pencil className='size-4' />
                Project
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value='billing'>
                <CreditCard className='size-4' />
                Billing
              </TabsTrigger>
            )}
            <TabsTrigger value='user'>
              <User className='size-4' />
              User
            </TabsTrigger>
            <TabsTrigger value='cli'>
              <Terminal className='size-4' />
              CLI
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value='project' className='overflow-y-auto'>
              <ProjectSettingsTab onClose={() => onOpenChange(false)} />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value='billing' className='overflow-y-auto'>
              <BillingTab onClose={() => onOpenChange(false)} />
            </TabsContent>
          )}
          <TabsContent value='user' className='overflow-y-auto'>
            <UserSettingsTab />
          </TabsContent>
          <TabsContent value='cli' className='overflow-y-auto'>
            <CliInstallTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
