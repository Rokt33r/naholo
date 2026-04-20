'use client'

import { createContext, useContext } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'

type OperationsListContextValue = {
  isMobile: boolean
  collapsed: boolean
  toggle: () => void
  showList: boolean
  showCollapseButton: boolean
}

const OperationsListContext = createContext<OperationsListContextValue | null>(
  null,
)

export function OperationsListProvider({
  children,
  hasSelectedOperation,
}: {
  children: React.ReactNode
  hasSelectedOperation: boolean
}) {
  const isMobile = useIsMobile()
  const [preferCollapsed, setPreferCollapsed] = useLocalStorage(
    'operations-list-collapsed',
    false,
  )
  const toggle = () => setPreferCollapsed((prev) => !prev)
  const collapsed = hasSelectedOperation && preferCollapsed
  const showList = isMobile ? !hasSelectedOperation : true
  const showCollapseButton = !isMobile && hasSelectedOperation

  return (
    <OperationsListContext
      value={{
        isMobile,
        collapsed,
        toggle,
        showList,
        showCollapseButton,
      }}
    >
      {children}
    </OperationsListContext>
  )
}

export function useOperationsList() {
  const ctx = useContext(OperationsListContext)
  if (!ctx) {
    throw new Error(
      'useOperationsList must be used within OperationsListProvider',
    )
  }
  return ctx
}

export function OperationsListPanel({
  children,
}: {
  children: React.ReactNode
}) {
  const { collapsed } = useOperationsList()
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
