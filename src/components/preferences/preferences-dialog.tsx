'use client'

import Link from 'next/link'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Palette, Terminal, Newspaper } from 'lucide-react'
import { UserSettingsTab } from '@/components/preferences/user-settings-tab'
import { AppearanceSettingsTab } from '@/components/preferences/appearance-settings-tab'
import { CliInstallTab } from '@/components/preferences/cli-install-tab'

type PreferencesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreferencesDialog({
  open,
  onOpenChange,
}: PreferencesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[min(480px,80vh)] sm:max-w-2xl'>
        <DialogTitle className='sr-only'>Preferences</DialogTitle>
        <Tabs
          defaultValue='user'
          orientation='vertical'
          className='h-full overflow-hidden'
        >
          <TabsList className='w-[160px] shrink-0'>
            <TabsTrigger value='user'>
              <User className='size-4' />
              User
            </TabsTrigger>
            <TabsTrigger value='appearance'>
              <Palette className='size-4' />
              Appearance
            </TabsTrigger>
            <TabsTrigger value='cli'>
              <Terminal className='size-4' />
              CLI
            </TabsTrigger>
            <Link
              href='/patchnotes'
              target='_blank'
              rel='noopener noreferrer'
              className='text-muted-foreground hover:text-foreground inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all'
            >
              <Newspaper className='size-4' />
              Patchnotes
            </Link>
          </TabsList>

          <TabsContent value='user' className='overflow-y-auto'>
            <UserSettingsTab />
          </TabsContent>
          <TabsContent value='appearance' className='overflow-y-auto'>
            <AppearanceSettingsTab />
          </TabsContent>
          <TabsContent value='cli' className='overflow-y-auto'>
            <CliInstallTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
