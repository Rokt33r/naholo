'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { useProjectContext } from '@/components/app/project-context'
import { OperatorsList } from '@/components/operators/operators-list'
import { useIsMobile } from '@/hooks/use-is-mobile'

export default function OperatorsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectSlug, projectName, projects } = useProjectContext()
  const isMobile = useIsMobile()
  const segment = useSelectedLayoutSegment()
  const showList = !isMobile || segment === null

  return (
    <div className='flex h-full w-full'>
      {!isMobile && (
        <div className='flex w-80 flex-col border-r'>
          <OperatorsList
            projectSlug={projectSlug}
            projectName={projectName}
            projects={projects}
          />
        </div>
      )}
      {showList && isMobile ? (
        <div className='flex-1 overflow-hidden'>
          <OperatorsList
            projectSlug={projectSlug}
            projectName={projectName}
            projects={projects}
          />
        </div>
      ) : (
        <div className='flex-1 overflow-hidden'>{children}</div>
      )}
    </div>
  )
}
