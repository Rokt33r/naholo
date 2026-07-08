'use client'

import { FolderCog } from 'lucide-react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectSlug } = useProjectContext()
  const isMobile = useIsMobile()
  const segment = useSelectedLayoutSegment()

  const showNav = !isMobile || segment == null
  const showContent = !isMobile || segment != null

  return (
    <div className='flex h-full'>
      {showNav && (
        <div
          className={cn('flex shrink-0 flex-col', isMobile ? 'w-full' : 'w-44')}
        >
          <div className='flex h-10 items-center gap-2 px-2 pt-2'>
            {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
            <h2 className='flex flex-1 items-center gap-2 whitespace-nowrap px-2 font-semibold'>
              <FolderCog className='size-4' />
              Project settings
            </h2>
          </div>
          <SettingsNav />
        </div>
      )}

      {showContent && <div className='flex-1 overflow-y-auto'>{children}</div>}
    </div>
  )
}
