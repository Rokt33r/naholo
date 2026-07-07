'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { Contact, CreditCard, Pencil, Tag } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { publicConfig } from '@/lib/publicConfig'
import { cn } from '@/lib/utils'

export function SettingsNav() {
  const { projectSlug } = useProjectContext()
  const segment = useSelectedLayoutSegment()

  const sections = [
    { segment: null, label: 'General', icon: Pencil },
    { segment: 'operators', label: 'Operators', icon: Contact },
    { segment: 'labels', label: 'Labels', icon: Tag },
    ...(publicConfig.billing
      ? [{ segment: 'subscription', label: 'Subscription', icon: CreditCard }]
      : []),
  ]

  return (
    <nav className='text-muted-foreground flex w-full flex-col gap-1 p-2'>
      {sections.map((section) => {
        const href =
          section.segment == null
            ? `/app/projects/${projectSlug}/settings`
            : `/app/projects/${projectSlug}/settings/${section.segment}`
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
