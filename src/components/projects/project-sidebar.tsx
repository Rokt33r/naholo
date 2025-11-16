'use client'

import { Plus, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

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
    <Sidebar collapsible='none' className='items-center'>
      <SidebarContent className='items-center py-2'>
        <SidebarMenu className='items-center'>
          {projects.map((project) => (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton
                size='xl'
                isActive={currentProjectId === project.id}
                onClick={() => handleProjectClick(project.id)}
                tooltip={project.name}
                className='font-semibold border-1'
              >
                {getProjectInitials(project.name)}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          <SidebarMenuItem>
            <CreateProjectDialog>
              <SidebarMenuButton
                size='xl'
                className='border-2 border-dashed border-sidebar-border hover:border-sidebar-foreground'
                tooltip='Add project'
              >
                <Plus className='h-5 w-5' />
              </SidebarMenuButton>
            </CreateProjectDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='items-center'>
        <SidebarMenu className='items-center'>
          <SidebarMenuItem>
            <SidebarMenuButton size='xl' tooltip='Settings'>
              <Settings className='h-5 w-5' />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
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
