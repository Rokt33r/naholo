'use client'

import { useState } from 'react'
import { LandPlot, Contact, Settings, Menu, Check, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SettingsDialog } from '@/components/settings/settings-dialog'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { useProjectContext } from '@/components/app/project-context'

type AppModeMenuProps = {
  currentProjectSlug: string
}

export function AppModeMenu({ currentProjectSlug }: AppModeMenuProps) {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { projects } = useProjectContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon-sm'>
          <Menu className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => router.push(`/app/projects/${project.slug}`)}
          >
            <span className='flex-1'>{project.name}</span>
            {project.slug === currentProjectSlug && (
              <Check className='text-muted-foreground h-4 w-4' />
            )}
          </DropdownMenuItem>
        ))}
        <CreateProjectDialog>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Plus className='mr-2 h-4 w-4' />
            Create project
          </DropdownMenuItem>
        </CreateProjectDialog>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/operations`)
          }
        >
          <LandPlot className='mr-2 h-4 w-4' />
          Operations
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/operators`)
          }
        >
          <Contact className='mr-2 h-4 w-4' />
          Operators
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
          <Settings className='mr-2 h-4 w-4' />
          Settings
        </DropdownMenuItem>
      </DropdownMenuContent>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </DropdownMenu>
  )
}
