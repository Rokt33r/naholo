'use client'

import { createContext, useContext } from 'react'
import type { Project, ProjectOperatorInfo } from '@/hooks/use-projects'

type ProjectContextValue = {
  projectId: string
  projectSlug: string
  projectName: string
  projects: Project[]
  currentOperator: ProjectOperatorInfo
}

export const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProjectContext() {
  const ctx = useContext(ProjectContext)
  if (!ctx) {
    throw new Error('useProjectContext must be used within ProjectLayout')
  }
  return ctx
}
