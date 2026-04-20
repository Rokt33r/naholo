'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { useProjectContext } from '@/components/app/project-context'
import { IssuesListProvider } from '@/components/issues/issues-list-context'
import { IssuesLayoutContent } from '@/components/issues/issues-layout-content'

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectSlug, projectName, projects } = useProjectContext()
  const segment = useSelectedLayoutSegment()
  const hasSelectedOperation = segment !== null

  return (
    <IssuesListProvider hasSelectedIssue={hasSelectedOperation}>
      <IssuesLayoutContent
        projectSlug={projectSlug}
        projectName={projectName}
        projects={projects}
      >
        {children}
      </IssuesLayoutContent>
    </IssuesListProvider>
  )
}
