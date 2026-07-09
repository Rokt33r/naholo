'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { useProjectContext } from '@/components/app/project-context'
import { SETTINGS_SECTIONS } from '@/components/settings/settings-sections'
import { cn } from '@/lib/utils'

export function SettingsNav() {
  const { projectSlug } = useProjectContext()
  const segment = useSelectedLayoutSegment()

  return (
    <nav className='text-muted-foreground flex w-full flex-col gap-1 p-2'>
      {SETTINGS_SECTIONS.map((section) => {
        const href = `/app/projects/${projectSlug}/settings/${section.segment}`
        const isActive = segment === section.segment
        const Icon = section.icon

        return (
          <Link
            key={section.label}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              isActive ? 'bg-accent text-foreground' : 'hover:text-foreground',
            )}
          >
            <Icon className='size-4' />
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
