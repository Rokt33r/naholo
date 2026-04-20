'use client'

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

import { useObjectiveContext } from './objective-context'
import { ObjectiveActions } from './objective-actions'
import { ObjectiveNote } from './objective-note'
import { LinkifiedText } from './linkified-text'
import type { Objective } from '@/hooks/use-objectives'

type ObjectiveItemProps = {
  objective: Objective
  depth?: number
}

export function ObjectiveItem({ objective, depth = 0 }: ObjectiveItemProps) {
  const {
    getChildObjectives,
    getPreviousSibling,
    getNextSibling,
    getParent,
    getNextVisibleObjective,
    getPreviousVisibleObjective,
    openNewObjectiveItem,
    updateObjective,
    setObjectiveDone,
    deleteObjective,
    indentObjective,
    outdentObjective,
    moveUp,
    moveDown,
    isListFocused,
    focusedObjectiveId,
    setFocusedObjectiveId,
  } = useObjectiveContext()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(objective.name)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)

  const rowRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const skipBlurSaveRef = useRef(false)

  const subtasks = getChildObjectives(objective.id)
  const isCreating = objective.id.startsWith('temp-')
  const isFocused = focusedObjectiveId === objective.id
  const previousSibling = useMemo(
    () => getPreviousSibling(objective.id),
    [getPreviousSibling, objective.id],
  )
  const canIndent = !!previousSibling
  const canOutdent = !!objective.parentObjectiveId

  // Reset editing state when focus leaves
  useEffect(() => {
    if (!isFocused) {
      setIsEditingNote(false)
    }
  }, [isFocused])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.setSelectionRange(name.length, name.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const handleToggleDone = async (checked: boolean) => {
    setIsLoading(true)
    try {
      await setObjectiveDone(objective.id, checked === true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleObjectiveNameClick = () => {
    setFocusedObjectiveId(objective.id)
    setName(objective.name)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== objective.name) {
      setIsLoading(true)
      try {
        await updateObjective(objective.id, trimmed)
      } finally {
        setIsLoading(false)
      }
    } else {
      setName(objective.name)
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this objective?')) {
      return
    }
    setIsLoading(true)
    try {
      await deleteObjective(objective.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSubtask = () => {
    // Find last subtask to insert after
    const lastSubtask = subtasks[subtasks.length - 1]
    openNewObjectiveItem(objective.id, lastSubtask?.id ?? null)
  }

  const handleDeleteWithFocus = async () => {
    if (!confirm('Are you sure you want to delete this objective?')) {
      return
    }
    // Determine focus target before deleting
    const nextSibling = getNextSibling(objective.id)
    const parent = getParent(objective.id)
    const focusTargetId = nextSibling?.id ?? parent?.id ?? null

    setIsLoading(true)
    try {
      await deleteObjective(objective.id)
      if (focusTargetId) {
        setFocusedObjectiveId(focusTargetId)
        requestAnimationFrame(() => {
          const el = document.querySelector(
            `[data-objective-id="${focusTargetId}"]`,
          ) as HTMLElement | null
          el?.focus()
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToObjective = (direction: 'up' | 'down') => {
    const getTarget =
      direction === 'up' ? getPreviousVisibleObjective : getNextVisibleObjective
    let target = getTarget(objective.id)
    // Skip collapsed (non-rendered) objectives
    while (target) {
      const el = document.querySelector(
        `[data-objective-id="${target.id}"]`,
      ) as HTMLElement | null
      if (el) {
        setFocusedObjectiveId(target.id)
        el.focus()
        return
      }
      target = getTarget(target.id)
    }
  }

  const handleRowKeyDown = async (e: KeyboardEvent<HTMLDivElement>) => {
    // Don't handle keys when editing
    if (isEditing || isEditingNote) return

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        handleObjectiveNameClick()
        break

      case 'ArrowUp':
        if (e.altKey) {
          e.preventDefault()
          moveUp(objective.id)
        } else {
          e.preventDefault()
          navigateToObjective('up')
        }
        break

      case 'ArrowDown':
        if (e.altKey) {
          e.preventDefault()
          moveDown(objective.id)
        } else {
          e.preventDefault()
          navigateToObjective('down')
        }
        break

      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          if (canOutdent) {
            await outdentObjective(objective.id)
            requestAnimationFrame(() => {
              const el = document.querySelector(
                `[data-objective-id="${objective.id}"]`,
              ) as HTMLElement | null
              el?.focus()
            })
          }
        } else {
          if (canIndent) {
            await indentObjective(objective.id)
            requestAnimationFrame(() => {
              const el = document.querySelector(
                `[data-objective-id="${objective.id}"]`,
              ) as HTMLElement | null
              el?.focus()
            })
          }
        }
        break

      case 'e':
        e.preventDefault()
        handleObjectiveNameClick()
        break

      case 'n':
        e.preventDefault()
        if (!isEditingNote) {
          setIsEditingNote(true)
        }
        break

      case 'Backspace':
        if (e.metaKey) {
          e.preventDefault()
          handleDeleteWithFocus()
        }
        break

      case 'Delete':
        e.preventDefault()
        handleDeleteWithFocus()
        break
    }
  }

  const handleObjectiveNameInputKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = name.trim()
      if (trimmed && trimmed !== objective.name) {
        updateObjective(objective.id, trimmed)
      }
      setIsEditing(false)
      if (trimmed) {
        // Create new objective at same level, after current objective
        openNewObjectiveItem(objective.parentObjectiveId, objective.id)
      } else {
        // Empty name — just exit editing, refocus row
        setName(objective.name)
        rowRef.current?.focus()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = name.trim()
      if (trimmed && trimmed !== objective.name) {
        updateObjective(objective.id, trimmed)
      } else {
        setName(objective.name)
      }
      setIsEditing(false)
      rowRef.current?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = name.trim()
      if (trimmed && trimmed !== objective.name) {
        updateObjective(objective.id, trimmed)
      } else {
        setName(objective.name)
      }
      setIsEditing(false)
      setIsEditingNote(true)
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.target === rowRef.current) {
      setFocusedObjectiveId(objective.id)
    }
  }

  return (
    <div className='group/item' style={{ paddingLeft: depth * 24 }}>
      <div
        ref={rowRef}
        data-objective-id={objective.id}
        tabIndex={0}
        onFocus={handleFocus}
        onKeyDown={handleRowKeyDown}
        className={cn(
          'relative rounded outline-none hover:bg-zinc-50 dark:hover:bg-zinc-900',
          isFocused && isListFocused && 'z-10 ring-2 ring-blue-500',
        )}
      >
        {/* Main row */}
        <div className='flex items-start py-1 px-2'>
          {/* Checkbox */}
          <Checkbox
            checked={objective.done}
            onCheckedChange={handleToggleDone}
            disabled={isLoading}
            className='mt-1 shrink-0 border-zinc-300 dark:border-zinc-600'
            tabIndex={-1}
          />

          {/* Name */}
          <div className='min-h-6 flex-1 overflow-hidden px-2'>
            {isEditing ? (
              <input
                ref={nameInputRef}
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (skipBlurSaveRef.current) {
                    skipBlurSaveRef.current = false
                    return
                  }
                  handleSave()
                }}
                onKeyDown={handleObjectiveNameInputKeyDown}
                className='block w-full border-0 bg-transparent p-0 leading-6 outline-none'
              />
            ) : (
              <>
                <span onClick={handleObjectiveNameClick}>
                  <LinkifiedText
                    text={objective.name}
                    className={cn(
                      'block cursor-text whitespace-pre-wrap leading-6',
                      objective.done && 'text-zinc-500 line-through',
                    )}
                  />
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <ObjectiveActions
            isCreating={isCreating}
            isLoading={isLoading}
            canIndent={canIndent}
            canOutdent={canOutdent}
            hasPreviousSibling={!!previousSibling}
            onAddSubtask={handleAddSubtask}
            onDelete={handleDelete}
            onMoveUp={() => moveUp(objective.id)}
            onMoveDown={() => moveDown(objective.id)}
            onIndent={() => indentObjective(objective.id)}
            onOutdent={() => outdentObjective(objective.id)}
          />
        </div>

        {/* Note section - animated */}
        <ObjectiveNote
          objective={objective}
          isFocused={isFocused}
          isEditingNote={isEditingNote}
          setIsEditingNote={setIsEditingNote}
          onStartEditingName={() => {
            setName(objective.name)
            setIsEditing(true)
          }}
          rowRef={rowRef}
        />
      </div>
    </div>
  )
}
