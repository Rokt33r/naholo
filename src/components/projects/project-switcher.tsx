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
        <button className='flex-1 flex items-center gap-1 px-2 font-semibold hover:bg-accent rounded-md py-1 cursor-pointer'>
          <div className='flex-1 text-left'>{currentProjectName}</div>
          <ChevronDown className='h-4 w-4 text-muted-foreground' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-56'>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => handleProjectClick(project.slug)}
          >
            <span className='flex-1'>{project.name}</span>
            {project.slug === currentProjectSlug && (
              <Check className='h-4 w-4 text-muted-foreground' />
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
