'use client'

import { useRef, type FocusEvent } from 'react'
import { ObjectiveProvider, useObjectiveContext } from './objective-context'
import { ObjectiveItem } from './objective-item'
import { NewObjectiveItem } from './new-objective-item'

type ObjectivesListProps = {
  projectSlug: string
  operationNumber: number
}

export function ObjectivesList({
  projectSlug,
  operationNumber,
}: ObjectivesListProps) {
  return (
    <ObjectiveProvider
      projectSlug={projectSlug}
      operationNumber={operationNumber}
    >
      <ObjectivesListContent />
    </ObjectiveProvider>
  )
}

function ObjectivesListContent() {
  const {
    isLoading,
    getFlattenedObjectives,
    getRootObjectives,
    setIsListFocused,
    newObjectiveItemState,
    openNewObjectiveItem,
  } = useObjectiveContext()

  const containerRef = useRef<HTMLDivElement>(null)

  const handleContainerFocus = () => {
    setIsListFocused(true)
  }

  const handleContainerBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (
      containerRef.current &&
      e.relatedTarget instanceof Node &&
      containerRef.current.contains(e.relatedTarget)
    ) {
      return
    }
    setIsListFocused(false)
  }

  const flattenedObjectives = getFlattenedObjectives()
  const rootObjectives = getRootObjectives()

  const handleBottomClick = () => {
    if (!newObjectiveItemState) {
      const lastRootObjective = rootObjectives[rootObjectives.length - 1]
      openNewObjectiveItem(null, lastRootObjective?.id ?? null)
    }
  }

  // Build the flat render list: objectives + optional creation input
  const renderItems: Array<
    | {
        type: 'objective'
        objective: (typeof flattenedObjectives)[0]['objective']
        depth: number
        key: string
      }
    | {
        type: 'creation'
        depth: number
        parentObjectiveId: string | null
        afterObjectiveId: string | null
        key: string
      }
  > = []

  for (const { objective, depth } of flattenedObjectives) {
    renderItems.push({ type: 'objective', objective, depth, key: objective.id })
  }

  // Insert creation input at the right position
  if (newObjectiveItemState) {
    const { parentObjectiveId, afterObjectiveId } = newObjectiveItemState
    const creationDepth = parentObjectiveId
      ? (flattenedObjectives.find((ft) => ft.objective.id === parentObjectiveId)
          ?.depth ?? 0) + 1
      : 0

    if (afterObjectiveId) {
      // Find the index after the afterObjective and all its descendants
      const afterIndex = renderItems.findIndex(
        (item) => item.type === 'objective' && item.key === afterObjectiveId,
      )
      if (afterIndex !== -1) {
        // Skip past all descendants (items with greater depth immediately after)
        let insertIndex = afterIndex + 1
        const afterDepth = renderItems[afterIndex].depth
        while (
          insertIndex < renderItems.length &&
          renderItems[insertIndex].depth > afterDepth
        ) {
          insertIndex++
        }
        renderItems.splice(insertIndex, 0, {
          type: 'creation',
          depth: creationDepth,
          parentObjectiveId,
          afterObjectiveId,
          key: 'creation-input',
        })
      } else {
        // afterObjective not visible (collapsed), append at end
        renderItems.push({
          type: 'creation',
          depth: creationDepth,
          parentObjectiveId,
          afterObjectiveId,
          key: 'creation-input',
        })
      }
    } else {
      // No afterObjectiveId — insert at beginning of parent's children
      if (parentObjectiveId) {
        const parentIndex = renderItems.findIndex(
          (item) => item.type === 'objective' && item.key === parentObjectiveId,
        )
        renderItems.splice(parentIndex + 1, 0, {
          type: 'creation',
          depth: creationDepth,
          parentObjectiveId,
          afterObjectiveId,
          key: 'creation-input',
        })
      } else {
        // Root level, beginning
        renderItems.splice(0, 0, {
          type: 'creation',
          depth: 0,
          parentObjectiveId: null,
          afterObjectiveId: null,
          key: 'creation-input',
        })
      }
    }
  }

  if (
    !isLoading &&
    flattenedObjectives.length === 0 &&
    !newObjectiveItemState
  ) {
    return (
      <div
        className='flex h-full flex-col items-center justify-center px-2 py-2 text-center cursor-text'
        onClick={() => openNewObjectiveItem(null, null)}
      >
        <p className='text-sm text-zinc-500'>
          Click here to break this operation into objectives
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='p-4'>
        <div className='mb-3'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-500'>
            Objectives
          </h2>
        </div>
        <div className='py-8 text-center text-sm text-zinc-500'>Loading...</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className='flex h-full flex-col py-2 px-2 overflow-auto'
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
    >
      <div>
        {renderItems.map((item) => {
          if (item.type === 'objective') {
            return (
              <ObjectiveItem
                key={item.key}
                objective={item.objective}
                depth={item.depth}
              />
            )
          }
          return (
            <NewObjectiveItem
              key={item.key}
              depth={item.depth}
              parentObjectiveId={item.parentObjectiveId}
              afterObjectiveId={item.afterObjectiveId}
            />
          )
        })}
      </div>

      {/* Clickable bottom area */}
      <div
        className='min-h-[100px] flex-1 cursor-text'
        onClick={handleBottomClick}
      />
    </div>
  )
}
