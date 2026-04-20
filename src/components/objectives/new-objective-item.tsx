'use client'

import { KeyboardEvent, useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { useObjectiveContext } from './objective-context'

type NewObjectiveItemProps = {
  depth: number
  parentObjectiveId: string | null
  afterObjectiveId: string | null
}

export function NewObjectiveItem({
  depth,
  parentObjectiveId,
  afterObjectiveId,
}: NewObjectiveItemProps) {
  const {
    createObjective,
    getChildObjectives,
    getRootObjectives,
    closeNewObjectiveItem,
    updateNewObjectiveItemAfterObjectiveId,
    setFocusedObjectiveId,
    newObjectiveItemState,
  } = useObjectiveContext()

  const previousFocusedObjectiveId =
    newObjectiveItemState?.previousFocusedObjectiveId ?? null

  const [name, setName] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getPosition = () => {
    if (afterObjectiveId) {
      const siblings = parentObjectiveId
        ? getChildObjectives(parentObjectiveId)
        : getRootObjectives()
      const afterObjective = siblings.find((t) => t.id === afterObjectiveId)
      return afterObjective ? afterObjective.position + 1 : 0
    }
    return 0
  }

  const lastCreatedObjectiveIdRef = useRef<string | null>(null)

  const handleContinuousCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const newObjectiveId = await createObjective(
      trimmed,
      null,
      parentObjectiveId,
      getPosition(),
    )
    if (newObjectiveId) {
      setName('')
      lastCreatedObjectiveIdRef.current = newObjectiveId
      updateNewObjectiveItemAfterObjectiveId(newObjectiveId)
    }
  }

  const handleSaveQuiet = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await createObjective(trimmed, null, parentObjectiveId, getPosition())
    closeNewObjectiveItem()
  }

  const handleCancelAndRestore = () => {
    closeNewObjectiveItem()
    const restoreId =
      lastCreatedObjectiveIdRef.current ?? previousFocusedObjectiveId
    if (restoreId) {
      setFocusedObjectiveId(restoreId)
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-objective-id="${restoreId}"]`,
        ) as HTMLElement | null
        el?.focus()
      })
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (name.trim()) {
        handleContinuousCreate()
      } else {
        handleCancelAndRestore()
      }
    }
    if (e.key === 'Escape') {
      handleCancelAndRestore()
    }
  }

  return (
    <div style={{ paddingLeft: depth * 24 }}>
      <div
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          'relative flex items-start rounded py-1 px-2',
          isFocused && 'z-10 ring-2 ring-blue-500',
        )}
      >
        <Checkbox
          disabled
          className='mt-1 shrink-0 border-zinc-300 dark:border-zinc-600'
          tabIndex={-1}
        />
        <div className='min-h-6 flex-1 overflow-hidden px-2'>
          <input
            ref={inputRef}
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (name.trim()) {
                handleSaveQuiet()
              } else {
                closeNewObjectiveItem()
              }
            }}
            placeholder='New objective...'
            className='block w-full border-0 bg-transparent p-0 leading-6 outline-none'
          />
        </div>
      </div>
    </div>
  )
}
