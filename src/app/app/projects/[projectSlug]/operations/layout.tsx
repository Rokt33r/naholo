'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { useProjectContext } from '@/components/app/project-context'
import { OperationsListProvider } from '@/components/operations/operations-list-context'
import { OperationsLayoutContent } from '@/components/operations/operations-layout-content'

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectSlug } = useProjectContext()
  const segment = useSelectedLayoutSegment()
  const hasSelectedOperation = segment !== null

  return (
    <OperationsListProvider hasSelectedOperation={hasSelectedOperation}>
      <OperationsLayoutContent projectSlug={projectSlug}>
        {children}
      </OperationsLayoutContent>
    </OperationsListProvider>
  )
}
