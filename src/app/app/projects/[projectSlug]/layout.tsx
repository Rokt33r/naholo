'use client'

import { useParams, useSelectedLayoutSegment } from 'next/navigation'
import { AppModeSidebar } from '@/components/app/app-mode-sidebar'
import { ProjectContext } from '@/components/app/project-context'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useProjects } from '@/hooks/use-projects'
import { ProjectSubscriptionWall } from '@/components/billing/project-subscription-wall'

function ProjectLayoutInner({ children }: { children: React.ReactNode }) {
  const { projectSlug } = useParams<{ projectSlug: string }>()
  const segment = useSelectedLayoutSegment()
  const currentMode = segment ?? 'operations'
  const isMobile = useIsMobile()
  const { data: projects = [], isPending, isFetching } = useProjects()
  const project = projects.find((p) => p.slug === projectSlug)

  if (project == null) {
    if (isPending || isFetching) {
      return <div className='h-full w-full' aria-busy='true' />
    }
    return null
  }

  return (
    <ProjectContext
      value={{
        projectId: project.id,
        projectSlug,
        projectName: project.name,
        projects,
        currentOperator: project.projectOperatorOfCurrentUser,
      }}
    >
      <div className='flex h-screen w-full'>
        {!isMobile && (
          <AppModeSidebar
            currentProjectSlug={projectSlug}
            currentMode={currentMode}
          />
        )}
        <div className='flex-1 overflow-hidden'>
          <ProjectSubscriptionWall>{children}</ProjectSubscriptionWall>
        </div>
      </div>
    </ProjectContext>
  )
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProjectLayoutInner>{children}</ProjectLayoutInner>
}
