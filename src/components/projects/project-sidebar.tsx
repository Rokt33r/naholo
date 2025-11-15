'use client'

import { Plus, Settings, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { cn } from '@/lib/utils'

type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

type ProjectSidebarProps = {
  projects: Project[]
  currentProjectId: string | null
}

export function ProjectSidebar({
  projects,
  currentProjectId,
}: ProjectSidebarProps) {
  const router = useRouter()

  const handleProjectClick = (projectId: string) => {
    router.push(`/app/projects/${projectId}`)
  }

  return (
    <div className='flex h-screen w-[72px] flex-col items-center gap-2 border-r bg-sidebar py-3'>
      {/* Projects List */}
      <div className='flex flex-1 flex-col items-center gap-2 overflow-y-auto'>
        {projects.map((project) => (
          <button
            key={project.id}
            className={cn(
              'h-[45px] w-[45px] shrink-0 rounded-lg text-xs font-semibold transition-colors',
              'inline-flex items-center justify-center',
              currentProjectId === project.id
                ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/80'
                : 'text-sidebar-foreground hover:bg-sidebar-accent',
            )}
            onClick={() => handleProjectClick(project.id)}
            title={project.name}
          >
            {getProjectInitials(project.name)}
          </button>
        ))}

        {/* Add Project Button */}
        <CreateProjectDialog>
          <Button
            variant='ghost'
            size='icon'
            className='h-[45px] w-[45px] shrink-0 rounded-lg border-2 border-dashed border-sidebar-border text-sidebar-foreground hover:border-sidebar-foreground hover:bg-sidebar-accent'
            title='Add project'
          >
            <Plus className='h-5 w-5' />
          </Button>
        </CreateProjectDialog>
      </div>

      {/* Bottom Section - User and Config */}
      <div className='flex flex-col items-center gap-2'>
        {/* User Button */}
        <Button
          variant='ghost'
          size='icon'
          className='h-[45px] w-[45px] shrink-0 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent'
          title='User'
        >
          <User className='h-5 w-5' />
        </Button>

        {/* Config Button */}
        <Button
          variant='ghost'
          size='icon'
          className='h-[45px] w-[45px] shrink-0 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent'
          title='Settings'
        >
          <Settings className='h-5 w-5' />
        </Button>
      </div>
    </div>
  )
}

function getProjectInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return name.substring(0, 2).toUpperCase()
  }
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}
