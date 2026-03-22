'use client'

import { useParams, useSelectedLayoutSegment } from 'next/navigation'
import { AppModeSidebar } from '@/components/app/app-mode-sidebar'
import { ProjectContext } from '@/components/app/project-context'
import { QueryProvider } from '@/components/query-provider'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useProjects } from '@/hooks/use-projects'

function ProjectLayoutInner({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>()
  const segment = useSelectedLayoutSegment()
  const currentMode = segment ?? 'issues'
  const isMobile = useIsMobile()
  const { data: projects = [] } = useProjects()
  const project = projects.find((p) => p.id === projectId)

  if (!project) {
    return null
  }

  return (
    <ProjectContext value={{ projectId, projectName: project.name, projects }}>
      <div className='flex h-screen w-full'>
        {!isMobile && (
          <AppModeSidebar
            currentProjectId={projectId}
            currentMode={currentMode}
          />
        )}
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    </ProjectContext>
  )
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <ProjectLayoutInner>{children}</ProjectLayoutInner>
    </QueryProvider>
  )
}
