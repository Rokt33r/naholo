'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Contact, LandPlot, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectContext } from '@/components/app/project-context'
import { SettingsDialog } from '@/components/settings/settings-dialog'

export default function ProjectPage() {
  const { projectSlug, projectName, projects } = useProjectContext()
  const project = projects.find((p) => p.slug === projectSlug)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 p-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
          {projectName}
        </h1>
        {project?.description != null && (
          <p className='text-muted-foreground text-sm'>{project.description}</p>
        )}
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button asChild>
          <Link href={`/app/projects/${projectSlug}/operations`}>
            <LandPlot className='size-5' />
            Operations
          </Link>
        </Button>
        <Button asChild variant='outline'>
          <Link href={`/app/projects/${projectSlug}/operators`}>
            <Contact className='size-5' />
            Operators
          </Link>
        </Button>
        <Button variant='outline' onClick={() => setSettingsOpen(true)}>
          <Settings className='size-5' />
          Settings
        </Button>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
