'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { useProjectContext } from '@/components/app/project-context'
import { IssuesList } from '@/components/issues/issues-list'
import {
  IssuesListProvider,
  IssuesListPanel,
} from '@/components/issues/issues-list-context'
import { useIsMobile } from '@/hooks/use-is-mobile'

export default function IssuesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectId, projectName, projects } = useProjectContext()
  const isMobile = useIsMobile()
  const segment = useSelectedLayoutSegment()
  const showList = !isMobile || segment === null

  return (
    <IssuesListProvider>
      <div className='flex h-full w-full'>
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
  )
}
