'use client'

import { createContext, useContext } from 'react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { AppModeSidebar } from '@/components/app/app-mode-sidebar'
import { IssuesList } from '@/components/issues/issues-list'
import {
  IssuesListProvider,
  IssuesListPanel,
} from '@/components/issues/issues-list-context'
import { QueryProvider } from '@/components/query-provider'
import { useIsMobile } from '@/hooks/use-is-mobile'

export type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

type ProjectContextValue = {
  projectId: string
  projectName: string
  projects: Project[]
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProjectContext() {
  const ctx = useContext(ProjectContext)
  if (!ctx) {
    throw new Error('useProjectContext must be used within ProjectLayoutClient')
  }
  return ctx
}

type ProjectLayoutClientProps = {
  projectId: string
  projectName: string
  projects: Project[]
  children: React.ReactNode
}

export function ProjectLayoutClient({
  projectId,
  projectName,
  projects,
  children,
}: ProjectLayoutClientProps) {
  const isMobile = useIsMobile()
  const segment = useSelectedLayoutSegment()
  const showList = !isMobile || segment === null

  return (
    <QueryProvider>
      <ProjectContext value={{ projectId, projectName, projects }}>
        <IssuesListProvider>
          <div className='flex h-screen w-full'>
            {!isMobile && (
              <AppModeSidebar
                currentProjectId={projectId}
                currentMode='issues'
              />
            )}
            {!isMobile && (
              <IssuesListPanel>
                <IssuesList
                  projectId={projectId}
                  projectName={projectName}
                  projects={projects}
                />
              </IssuesListPanel>
            )}
            {showList && isMobile ? (
              <div className='flex-1 overflow-hidden'>
                <IssuesList
                  projectId={projectId}
                  projectName={projectName}
                  projects={projects}
                />
              </div>
            ) : (
              <div className='flex-1 overflow-hidden'>{children}</div>
            )}
          </div>
        </IssuesListProvider>
      </ProjectContext>
    </QueryProvider>
  )
}
