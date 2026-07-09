'use client'

import { ArrowLeft, FolderCog } from 'lucide-react'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { SETTINGS_SECTIONS } from '@/components/settings/settings-sections'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { projectSlug } = useProjectContext()
  const isMobile = useIsMobile()
  const segment = useSelectedLayoutSegment()

  const showNav = !isMobile || segment == null
  const showContent = !isMobile || segment != null

  const section =
    segment != null
      ? SETTINGS_SECTIONS.find((entry) => entry.segment === segment)
      : undefined
  const SectionIcon = section?.icon

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

      {showContent && (
        <div className='flex-1 overflow-y-auto'>
          {section != null ? (
            <>
              {isMobile && (
                <div className='flex h-10 items-center gap-2 px-2 pt-2'>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() =>
                      router.push(`/app/projects/${projectSlug}/settings`)
                    }
                  >
                    <ArrowLeft className='size-4' />
                  </Button>
                  <h1 className='flex flex-1 items-center justify-center gap-2 font-semibold tracking-tight'>
                    {SectionIcon != null && <SectionIcon className='size-4' />}
                    {section.label}
                  </h1>
                  <div className='size-8' />
                </div>
              )}
              <div className='flex w-full max-w-2xl flex-col gap-3 p-4'>
                {children}
              </div>
            </>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}
