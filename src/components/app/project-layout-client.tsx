'use client'

import { AppModeSidebar } from '@/components/app/app-mode-sidebar'
import { IssuesList } from '@/components/issues/issues-list'
import {
  IssuesListProvider,
  IssuesListPanel,
} from '@/components/issues/issues-list-context'
import { QueryProvider } from '@/components/query-provider'
import { useIsMobile } from '@/hooks/use-is-mobile'

type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
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

  return (
    <QueryProvider>
      <IssuesListProvider>
        <div className='flex h-screen w-full'>
          {!isMobile && (
            <>
              <AppModeSidebar
                currentProjectId={projectId}
                currentMode='issues'
              />
              <IssuesListPanel>
                <IssuesList
                  projectId={projectId}
                  projectName={projectName}
                  projects={projects}
                />
              </IssuesListPanel>
            </>
          )}
          <div className='flex-1 overflow-hidden'>{children}</div>
        </div>
      </IssuesListProvider>
    </QueryProvider>
  )
}
