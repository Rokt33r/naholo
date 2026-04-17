'use client'

import { createContext, useContext } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { cn } from '@/lib/utils'

type IssuesListContextValue = {
  collapsed: boolean
  setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void
  toggle: () => void
  hasSelectedIssue: boolean
}

const IssuesListContext = createContext<IssuesListContextValue | null>(null)

export function IssuesListProvider({
  children,
  hasSelectedIssue,
}: {
  children: React.ReactNode
  hasSelectedIssue: boolean
}) {
  const [collapsed, setCollapsed] = useLocalStorage(
    'issues-list-collapsed',
    false,
  )
  const toggle = () => setCollapsed((prev) => !prev)
  const effectiveCollapsed = hasSelectedIssue && collapsed

  return (
    <IssuesListContext
      value={{
        collapsed: effectiveCollapsed,
        setCollapsed,
        toggle,
        hasSelectedIssue,
      }}
    >
      {children}
    </IssuesListContext>
  )
}

export function useIssuesList() {
  const ctx = useContext(IssuesListContext)
  if (!ctx)
    throw new Error('useIssuesList must be used within IssuesListProvider')
  return ctx
}

export function IssuesListPanel({ children }: { children: React.ReactNode }) {
  const { collapsed } = useIssuesList()
  return (
    <div
      className={cn(
        'flex flex-col border-r transition-all duration-200',
        collapsed ? 'w-0 overflow-hidden' : 'w-80',
      )}
    >
      <div className='w-80 flex-1 overflow-hidden'>{children}</div>
    </div>
  )
}
