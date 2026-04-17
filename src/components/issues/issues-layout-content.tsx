'use client'

import { IssuesList } from '@/components/issues/issues-list'
import { IssuesListPanel, useIssuesList } from './issues-list-context'
import type { Project } from 'naholo-api/types'

type IssuesLayoutContentProps = {
  projectSlug: string
  projectName: string
  projects: Project[]
  children: React.ReactNode
}

export function IssuesLayoutContent({
  projectSlug,
  projectName,
  projects,
  children,
}: IssuesLayoutContentProps) {
  const { isMobile, showList } = useIssuesList()

  const issuesList = (
    <IssuesList
      projectSlug={projectSlug}
      projectName={projectName}
      projects={projects}
    />
  )

  return (
    <div className='flex h-full w-full'>
      {!isMobile && <IssuesListPanel>{issuesList}</IssuesListPanel>}
      {showList && isMobile ? (
        <div className='flex-1 overflow-hidden'>{issuesList}</div>
      ) : (
        <div className='flex-1 overflow-hidden'>{children}</div>
      )}
    </div>
  )
}
