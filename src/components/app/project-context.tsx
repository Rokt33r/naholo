'use client'

import { createContext, useContext } from 'react'

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

export const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProjectContext() {
  const ctx = useContext(ProjectContext)
  if (!ctx) {
    throw new Error('useProjectContext must be used within ProjectLayout')
  }
  return ctx
}
