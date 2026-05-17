'use client'

import { Check, ChevronDown, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { cn } from '@/lib/utils'
import type { Project } from 'naholo-api/types'

type ProjectSwitcherProps = {
  projects: Project[]
  currentProjectSlug: string
  currentProjectName: string
}

export function ProjectSwitcher({
  projects,
  currentProjectSlug,
  currentProjectName,
}: ProjectSwitcherProps) {
  const router = useRouter()

  const handleProjectClick = (slug: string) => {
    router.push(`/app/projects/${slug}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'relative flex cursor-pointer items-center rounded-md transition-colors focus-visible:outline-none size-10 justify-center bg-foreground text-background',
          )}
          title={currentProjectName}
        >
          <span aria-hidden>{currentProjectName.slice(0, 1)}</span>
          <span className='sr-only'>Switch project</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' side={'right'} className='w-56'>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => handleProjectClick(project.slug)}
          >
            <span className='flex-1'>{project.name}</span>
            {project.slug === currentProjectSlug && (
              <Check className='text-muted-foreground h-4 w-4' />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <CreateProjectDialog>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Plus className='mr-2 h-4 w-4' />
            Create project
          </DropdownMenuItem>
        </CreateProjectDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
