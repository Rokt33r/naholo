'use client'

import { FolderCog } from 'lucide-react'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { useIsMobile } from '@/hooks/use-is-mobile'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectSlug } = useProjectContext()
  const isMobile = useIsMobile()

  return (
    <div className='flex h-full'>
      <div className='flex w-44 shrink-0 flex-col'>
        <div className='flex items-center gap-2 px-2 pt-2 h-10'>
          {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
          <h2 className='flex flex-1 items-center gap-2 px-2 font-semibold'>
            <FolderCog className='size-4' />
            Project settings
          </h2>
        </div>
        <SettingsNav />
      </div>

      <div className='flex-1 overflow-y-auto'>{children}</div>
    </div>
  )
}
