'use client'

import { createContext, useContext } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'

type IssuesListContextValue = {
  isMobile: boolean
  collapsed: boolean
  toggle: () => void
  showList: boolean
  showCollapseButton: boolean
}

const IssuesListContext = createContext<IssuesListContextValue | null>(null)

export function IssuesListProvider({
  children,
  hasSelectedIssue,
}: {
  children: React.ReactNode
  hasSelectedIssue: boolean
}) {
  const isMobile = useIsMobile()
  const [preferCollapsed, setPreferCollapsed] = useLocalStorage(
    'issues-list-collapsed',
    false,
  )
  const toggle = () => setPreferCollapsed((prev) => !prev)
  const collapsed = hasSelectedIssue && preferCollapsed
  const showList = isMobile ? !hasSelectedIssue : true
  const showCollapseButton = !isMobile && hasSelectedIssue

  return (
    <IssuesListContext
      value={{
        isMobile,
        collapsed,
        toggle,
        showList,
        showCollapseButton,
      }}
    >
      {children}
    </IssuesListContext>
  )
}

export function useIssuesList() {
  const ctx = useContext(IssuesListContext)
  if (!ctx) {
    throw new Error('useIssuesList must be used within IssuesListProvider')
  }
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
