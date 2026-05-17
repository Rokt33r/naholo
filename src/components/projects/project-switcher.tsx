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
  compact?: boolean
}

export function ProjectSwitcher({
  projects,
  currentProjectSlug,
  currentProjectName,
  compact = false,
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
            'hover:bg-accent flex cursor-pointer items-center rounded-md',
            compact
              ? 'size-9 justify-center text-sm font-semibold uppercase'
              : 'flex-1 gap-1 px-2 py-1 font-semibold',
          )}
          title={compact ? currentProjectName : undefined}
        >
          {compact ? (
            <span>{currentProjectName.slice(0, 1)}</span>
          ) : (
            <>
              <div className='flex-1 text-left'>{currentProjectName}</div>
              <ChevronDown className='text-muted-foreground h-4 w-4' />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        side={compact ? 'right' : 'bottom'}
        className='w-56'
      >
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
