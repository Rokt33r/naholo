'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  useObjectives,
  useCreateObjective,
  useMoveObjective,
  useUpdateObjective,
  useSetObjectiveDone,
  useUpdateObjectiveNote,
  useDeleteObjective,
  type Objective,
} from '@/hooks/use-objectives'

type NewObjectiveItemState = {
  parentObjectiveId: string | null
  afterObjectiveId: string | null // The objective after which to insert, null = beginning
  previousFocusedObjectiveId: string | null
} | null

export type FlatObjective = {
  objective: Objective
  depth: number
}

type ObjectiveContextValue = {
  // Data
  objectives: Objective[]
  isLoading: boolean

  // Focus management
  isListFocused: boolean
  setIsListFocused: (focused: boolean) => void
  focusedObjectiveId: string | null
  setFocusedObjectiveId: (id: string | null) => void

  // Dialog creation
  newObjectiveItemState: NewObjectiveItemState
  openNewObjectiveItem: (
    parentObjectiveId: string | null,
    afterObjectiveId: string | null,
  ) => void
  closeNewObjectiveItem: () => void
  updateNewObjectiveItemAfterObjectiveId: (afterObjectiveId: string) => void

  // Tree helpers
  getFlattenedObjectives: () => FlatObjective[]
  getRootObjectives: () => Objective[]
  getChildObjectives: (parentId: string) => Objective[]
  getSiblings: (objectiveId: string) => Objective[]
  getPreviousSibling: (objectiveId: string) => Objective | null
  getNextSibling: (objectiveId: string) => Objective | null
  getParent: (objectiveId: string) => Objective | null
  getObjective: (objectiveId: string) => Objective | null

  // Tree navigation (depth-first pre-order)
  getNextVisibleObjective: (objectiveId: string) => Objective | null
  getPreviousVisibleObjective: (objectiveId: string) => Objective | null

  // Operations
  createObjective: (
    name: string,
    note: string | null,
    parentObjectiveId: string | null,
    position?: number,
  ) => Promise<string | null>
  updateObjective: (objectiveId: string, name: string) => Promise<void>
  updateObjectiveNote: (
    objectiveId: string,
    note: string | null,
  ) => Promise<void>
  setObjectiveDone: (objectiveId: string, done: boolean) => Promise<void>
  deleteObjective: (objectiveId: string) => Promise<void>
  createObjectiveBelow: (objectiveId: string) => void
  indentObjective: (objectiveId: string) => Promise<boolean>
  outdentObjective: (objectiveId: string) => Promise<boolean>
  moveUp: (objectiveId: string) => Promise<boolean>
  moveDown: (objectiveId: string) => Promise<boolean>
}

const ObjectiveContext = createContext<ObjectiveContextValue | null>(null)

export function useObjectiveContext() {
  const context = useContext(ObjectiveContext)
  if (!context) {
    throw new Error(
      'useObjectiveContext must be used within a ObjectiveProvider',
    )
  }
  return context
}

type ObjectiveProviderProps = {
  projectSlug: string
  operationNumber: number
  children: ReactNode
}

export function ObjectiveProvider({
  projectSlug,
  operationNumber,
  children,
}: ObjectiveProviderProps) {
  const { data: objectives = [], isLoading } = useObjectives(
    projectSlug,
    operationNumber,
  )
  const createObjectiveMutation = useCreateObjective(
    projectSlug,
    operationNumber,
  )
  const updateObjectiveMutation = useUpdateObjective(
    projectSlug,
    operationNumber,
  )
  const setObjectiveDoneMutation = useSetObjectiveDone(
    projectSlug,
    operationNumber,
  )
  const deleteObjectiveMutation = useDeleteObjective(
    projectSlug,
    operationNumber,
  )
  const updateObjectiveNoteMutation = useUpdateObjectiveNote(
    projectSlug,
    operationNumber,
  )
  const moveObjectiveMutation = useMoveObjective(projectSlug, operationNumber)

  const [isListFocused, setIsListFocused] = useState(false)
  const [focusedObjectiveId, setFocusedObjectiveId] = useState<string | null>(
    null,
  )

  // Clear focusedObjectiveId when the list loses focus
  useEffect(() => {
    if (!isListFocused) {
      setFocusedObjectiveId(null)
    }
  }, [isListFocused])

  // Clear stale focusedObjectiveId if the objective was deleted
  useEffect(() => {
    if (
      focusedObjectiveId &&
      !objectives.find((t) => t.id === focusedObjectiveId)
    ) {
      setFocusedObjectiveId(null)
    }
  }, [objectives, focusedObjectiveId])
  const [newObjectiveItemState, setNewObjectiveItemState] =
    useState<NewObjectiveItemState>(null)

  // Tree helpers
  const getRootObjectives = useCallback(() => {
    return objectives
      .filter((t) => !t.parentObjectiveId)
      .sort((a, b) => a.position - b.position)
  }, [objectives])

  const getChildObjectives = useCallback(
    (parentId: string) => {
      return objectives
        .filter((t) => t.parentObjectiveId === parentId)
        .sort((a, b) => a.position - b.position)
    },
    [objectives],
  )

  const getSiblings = useCallback(
    (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return []
      return objectives
        .filter(
          (t) =>
            t.parentObjectiveId === objective.parentObjectiveId &&
            t.id !== objectiveId,
        )
        .sort((a, b) => a.position - b.position)
    },
    [objectives],
  )

  const getPreviousSibling = useCallback(
    (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return null
      const siblings = objectives
        .filter((t) => t.parentObjectiveId === objective.parentObjectiveId)
        .sort((a, b) => a.position - b.position)
      const index = siblings.findIndex((t) => t.id === objectiveId)
      return index > 0 ? siblings[index - 1] : null
    },
    [objectives],
  )

  const getNextSibling = useCallback(
    (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return null
      const siblings = objectives
        .filter((t) => t.parentObjectiveId === objective.parentObjectiveId)
        .sort((a, b) => a.position - b.position)
      const index = siblings.findIndex((t) => t.id === objectiveId)
      return index < siblings.length - 1 ? siblings[index + 1] : null
    },
    [objectives],
  )

  const getParent = useCallback(
    (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective || !objective.parentObjectiveId) return null
      return (
        objectives.find((t) => t.id === objective.parentObjectiveId) ?? null
      )
    },
    [objectives],
  )

  const getObjective = useCallback(
    (objectiveId: string) => {
      return objectives.find((t) => t.id === objectiveId) ?? null
    },
    [objectives],
  )

  // Flattened objective list (depth-first pre-order, respecting expand/collapse)
  const getFlattenedObjectives = useCallback((): FlatObjective[] => {
    const result: FlatObjective[] = []
    const walk = (parentId: string | null, depth: number) => {
      const children = objectives
        .filter((t) => t.parentObjectiveId === parentId)
        .sort((a, b) => a.position - b.position)
      for (const child of children) {
        result.push({ objective: child, depth })
        walk(child.id, depth + 1)
      }
    }
    walk(null, 0)
    return result
  }, [objectives])

  // Tree navigation helpers (depth-first pre-order)
  const getDeepestLastDescendant = useCallback(
    (objectiveId: string): Objective => {
      const children = objectives
        .filter((t) => t.parentObjectiveId === objectiveId)
        .sort((a, b) => a.position - b.position)
      if (children.length === 0) {
        return objectives.find((t) => t.id === objectiveId)!
      }
      return getDeepestLastDescendant(children[children.length - 1].id)
    },
    [objectives],
  )

  const getNextVisibleObjective = useCallback(
    (objectiveId: string): Objective | null => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return null

      // First child
      const children = objectives
        .filter((t) => t.parentObjectiveId === objectiveId)
        .sort((a, b) => a.position - b.position)
      if (children.length > 0) return children[0]

      // Next sibling, or walk up to find ancestor's next sibling
      let current: Objective | null = objective
      while (current) {
        const nextSib = getNextSibling(current.id)
        if (nextSib) return nextSib
        current = current.parentObjectiveId
          ? (objectives.find((t) => t.id === current!.parentObjectiveId) ??
            null)
          : null
      }

      return null
    },
    [objectives, getNextSibling],
  )

  const getPreviousVisibleObjective = useCallback(
    (objectiveId: string): Objective | null => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return null

      // Previous sibling's deepest last descendant
      const prevSib = getPreviousSibling(objectiveId)
      if (prevSib) return getDeepestLastDescendant(prevSib.id)

      // Parent
      if (objective.parentObjectiveId) {
        return (
          objectives.find((t) => t.id === objective.parentObjectiveId) ?? null
        )
      }

      return null
    },
    [objectives, getPreviousSibling, getDeepestLastDescendant],
  )

  // Dialog creation
  const openNewObjectiveItem = useCallback(
    (parentObjectiveId: string | null, afterObjectiveId: string | null) => {
      setNewObjectiveItemState({
        parentObjectiveId,
        afterObjectiveId,
        previousFocusedObjectiveId: focusedObjectiveId,
      })
      setFocusedObjectiveId(null)
    },
    [focusedObjectiveId],
  )

  const closeNewObjectiveItem = useCallback(() => {
    setNewObjectiveItemState(null)
  }, [])

  const updateNewObjectiveItemAfterObjectiveId = useCallback(
    (afterObjectiveId: string) => {
      setNewObjectiveItemState((prev) =>
        prev ? { ...prev, afterObjectiveId } : prev,
      )
    },
    [],
  )

  // Operations
  const createObjective = useCallback(
    async (
      name: string,
      note: string | null,
      parentObjectiveId: string | null,
      position?: number,
    ) => {
      try {
        const result = await createObjectiveMutation.mutateAsync({
          name,
          note,
          parentObjectiveId,
          position,
        })
        return result.id
      } catch (error) {
        return null
      }
    },
    [createObjectiveMutation],
  )

  const updateObjective = useCallback(
    async (objectiveId: string, name: string) => {
      await updateObjectiveMutation.mutateAsync({ objectiveId, name })
    },
    [updateObjectiveMutation],
  )

  const updateObjectiveNote = useCallback(
    async (objectiveId: string, note: string | null) => {
      await updateObjectiveNoteMutation.mutateAsync({ objectiveId, note })
    },
    [updateObjectiveNoteMutation],
  )

  const setObjectiveDone = useCallback(
    async (objectiveId: string, done: boolean) => {
      await setObjectiveDoneMutation.mutateAsync({ objectiveId, done })
    },
    [setObjectiveDoneMutation],
  )

  const deleteObjective = useCallback(
    async (objectiveId: string) => {
      await deleteObjectiveMutation.mutateAsync(objectiveId)
    },
    [deleteObjectiveMutation],
  )

  const createObjectiveBelow = useCallback(
    (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return
      openNewObjectiveItem(objective.parentObjectiveId, objectiveId)
    },
    [objectives, openNewObjectiveItem],
  )

  const indentObjective = useCallback(
    async (objectiveId: string) => {
      const previousSibling = getPreviousSibling(objectiveId)
      if (!previousSibling) return false

      // Move objective to become last child of previous sibling
      const newSiblings = getChildObjectives(previousSibling.id)
      const newPosition = newSiblings.length

      try {
        await moveObjectiveMutation.mutateAsync({
          objectiveId,
          newParentObjectiveId: previousSibling.id,
          newPosition,
        })
        return true
      } catch (error) {
        return false
      }
    },
    [getPreviousSibling, getChildObjectives, moveObjectiveMutation],
  )

  const outdentObjective = useCallback(
    async (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective || !objective.parentObjectiveId) return false

      const parent = getParent(objectiveId)
      if (!parent) return false

      // Move objective to become sibling of parent, positioned after parent
      const newPosition = parent.position + 1

      try {
        await moveObjectiveMutation.mutateAsync({
          objectiveId,
          newParentObjectiveId: parent.parentObjectiveId,
          newPosition,
        })
        return true
      } catch (error) {
        return false
      }
    },
    [objectives, getParent, moveObjectiveMutation],
  )

  const moveUp = useCallback(
    async (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return false

      const previousSibling = getPreviousSibling(objectiveId)
      if (!previousSibling) return false

      try {
        await moveObjectiveMutation.mutateAsync({
          objectiveId,
          newParentObjectiveId: objective.parentObjectiveId,
          newPosition: previousSibling.position,
        })
        return true
      } catch (error) {
        return false
      }
    },
    [objectives, getPreviousSibling, moveObjectiveMutation],
  )

  const moveDown = useCallback(
    async (objectiveId: string) => {
      const objective = objectives.find((t) => t.id === objectiveId)
      if (!objective) return false

      const nextSibling = getNextSibling(objectiveId)
      if (!nextSibling) return false

      try {
        await moveObjectiveMutation.mutateAsync({
          objectiveId,
          newParentObjectiveId: objective.parentObjectiveId,
          newPosition: nextSibling.position,
        })
        return true
      } catch (error) {
        return false
      }
    },
    [objectives, getNextSibling, moveObjectiveMutation],
  )

  const value = useMemo<ObjectiveContextValue>(
    () => ({
      objectives,
      isLoading,
      isListFocused,
      setIsListFocused,
      focusedObjectiveId,
      setFocusedObjectiveId,
      newObjectiveItemState,
      openNewObjectiveItem,
      closeNewObjectiveItem,
      updateNewObjectiveItemAfterObjectiveId,
      getFlattenedObjectives,
      getRootObjectives,
      getChildObjectives,
      getSiblings,
      getPreviousSibling,
      getNextSibling,
      getParent,
      getObjective,
      getNextVisibleObjective,
      getPreviousVisibleObjective,
      createObjective,
      updateObjective,
      updateObjectiveNote,
      setObjectiveDone,
      deleteObjective,
      createObjectiveBelow,
      indentObjective,
      outdentObjective,
      moveUp,
      moveDown,
    }),
    [
      objectives,
      isLoading,
      isListFocused,
      focusedObjectiveId,
      newObjectiveItemState,
      openNewObjectiveItem,
      closeNewObjectiveItem,
      updateNewObjectiveItemAfterObjectiveId,
      getFlattenedObjectives,
      getRootObjectives,
      getChildObjectives,
      getSiblings,
      getPreviousSibling,
      getNextSibling,
      getParent,
      getObjective,
      getNextVisibleObjective,
      getPreviousVisibleObjective,
      createObjective,
      updateObjective,
      updateObjectiveNote,
      setObjectiveDone,
      deleteObjective,
      createObjectiveBelow,
      indentObjective,
      outdentObjective,
      moveUp,
      moveDown,
    ],
  )

  return (
    <ObjectiveContext.Provider value={value}>
      {children}
    </ObjectiveContext.Provider>
  )
}
