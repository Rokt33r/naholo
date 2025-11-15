'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Project = {
  id: string
  name: string
}

type ProjectSelectorProps = {
  projects: Project[]
  currentProjectId?: string
}

export function ProjectSelector({
  projects,
  currentProjectId,
}: ProjectSelectorProps) {
  const router = useRouter()

  const handleProjectChange = (projectId: string) => {
    router.push(`/app/projects/${projectId}`)
  }

  if (projects.length === 0) {
    return <div className='text-sm text-zinc-500'>No projects yet</div>
  }

  return (
    <Select value={currentProjectId} onValueChange={handleProjectChange}>
      <SelectTrigger className='w-full border-none bg-transparent shadow-none focus:ring-0'>
        <SelectValue placeholder='Select a project' />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
