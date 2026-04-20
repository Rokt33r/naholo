'use client'

import { OperationsList } from '@/components/operations/operations-list'
import {
  OperationsListPanel,
  useOperationsList,
} from './operations-list-context'
import type { Project } from 'naholo-api/types'

type OperationsLayoutContentProps = {
  projectSlug: string
  projectName: string
  projects: Project[]
  children: React.ReactNode
}

export function OperationsLayoutContent({
  projectSlug,
  projectName,
  projects,
  children,
}: OperationsLayoutContentProps) {
  const { isMobile, showList } = useOperationsList()

  const operationsList = (
    <OperationsList
      projectSlug={projectSlug}
      projectName={projectName}
      projects={projects}
    />
  )

  return (
    <div className='flex h-full w-full'>
      {!isMobile && <OperationsListPanel>{operationsList}</OperationsListPanel>}
      {showList && isMobile ? (
        <div className='flex-1 overflow-hidden'>{operationsList}</div>
      ) : (
        <div className='flex-1 overflow-hidden'>{children}</div>
      )}
    </div>
  )
}
