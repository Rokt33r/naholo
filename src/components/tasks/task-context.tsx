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
  useTasks,
  useCreateTask,
  useMoveTask,
  useUpdateTask,
  useSetTaskDone,
  useUpdateTaskNote,
  useDeleteTask,
  type Task,
} from '@/hooks/use-tasks'

type NewTaskItemState = {
  parentTaskId: string | null
  afterTaskId: string | null // The task after which to insert, null = beginning
  previousFocusedTaskId: string | null
} | null

export type FlatTask = {
  task: Task
  depth: number
}

type TaskContextValue = {
  // Data
  tasks: Task[]
  isLoading: boolean

  // Focus management
  isListFocused: boolean
  setIsListFocused: (focused: boolean) => void
  focusedTaskId: string | null
  setFocusedTaskId: (id: string | null) => void

  // Dialog creation
  newTaskItemState: NewTaskItemState
  openNewTaskItem: (
    parentTaskId: string | null,
    afterTaskId: string | null,
  ) => void
  closeNewTaskItem: () => void
  updateNewTaskItemAfterTaskId: (afterTaskId: string) => void

  // Tree helpers
  getFlattenedTasks: () => FlatTask[]
  getRootTasks: () => Task[]
  getSubtasks: (parentId: string) => Task[]
  getSiblings: (taskId: string) => Task[]
  getPreviousSibling: (taskId: string) => Task | null
  getNextSibling: (taskId: string) => Task | null
  getParent: (taskId: string) => Task | null
  getTask: (taskId: string) => Task | null

  // Tree navigation (depth-first pre-order)
  getNextVisibleTask: (taskId: string) => Task | null
  getPreviousVisibleTask: (taskId: string) => Task | null

  // Operations
  createTask: (
    name: string,
    note: string | null,
    parentTaskId: string | null,
    position?: number,
  ) => Promise<string | null>
  updateTask: (taskId: string, name: string) => Promise<void>
  updateTaskNote: (taskId: string, note: string | null) => Promise<void>
  setTaskDone: (taskId: string, done: boolean) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  createTaskBelow: (taskId: string) => void
  indentTask: (taskId: string) => Promise<boolean>
  outdentTask: (taskId: string) => Promise<boolean>
  moveUp: (taskId: string) => Promise<boolean>
  moveDown: (taskId: string) => Promise<boolean>
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function useTaskContext() {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider')
  }
  return context
}

type TaskProviderProps = {
  projectId: string
  issueNumber: number
  children: ReactNode
}

export function TaskProvider({
  projectId,
  issueNumber,
  children,
}: TaskProviderProps) {
  const { data: tasks = [], isLoading } = useTasks(projectId, issueNumber)
  const createTaskMutation = useCreateTask(projectId, issueNumber)
  const updateTaskMutation = useUpdateTask(projectId, issueNumber)
  const setTaskDoneMutation = useSetTaskDone(projectId, issueNumber)
  const deleteTaskMutation = useDeleteTask(projectId, issueNumber)
  const updateTaskNoteMutation = useUpdateTaskNote(projectId, issueNumber)
  const moveTaskMutation = useMoveTask(projectId, issueNumber)

  const [isListFocused, setIsListFocused] = useState(false)
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)

  // Clear focusedTaskId when the list loses focus
  useEffect(() => {
    if (!isListFocused) {
      setFocusedTaskId(null)
    }
  }, [isListFocused])

  // Clear stale focusedTaskId if the task was deleted
  useEffect(() => {
    if (focusedTaskId && !tasks.find((t) => t.id === focusedTaskId)) {
      setFocusedTaskId(null)
    }
  }, [tasks, focusedTaskId])
  const [newTaskItemState, setNewTaskItemState] =
    useState<NewTaskItemState>(null)

  // Tree helpers
  const getRootTasks = useCallback(() => {
    return tasks
      .filter((t) => !t.parentTaskId)
      .sort((a, b) => a.position - b.position)
  }, [tasks])

  const getSubtasks = useCallback(
    (parentId: string) => {
      return tasks
        .filter((t) => t.parentTaskId === parentId)
        .sort((a, b) => a.position - b.position)
    },
    [tasks],
  )

  const getSiblings = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return []
      return tasks
        .filter((t) => t.parentTaskId === task.parentTaskId && t.id !== taskId)
        .sort((a, b) => a.position - b.position)
    },
    [tasks],
  )

  const getPreviousSibling = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return null
      const siblings = tasks
        .filter((t) => t.parentTaskId === task.parentTaskId)
        .sort((a, b) => a.position - b.position)
      const index = siblings.findIndex((t) => t.id === taskId)
      return index > 0 ? siblings[index - 1] : null
    },
    [tasks],
  )

  const getNextSibling = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return null
      const siblings = tasks
        .filter((t) => t.parentTaskId === task.parentTaskId)
        .sort((a, b) => a.position - b.position)
      const index = siblings.findIndex((t) => t.id === taskId)
      return index < siblings.length - 1 ? siblings[index + 1] : null
    },
    [tasks],
  )

  const getParent = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task || !task.parentTaskId) return null
      return tasks.find((t) => t.id === task.parentTaskId) ?? null
    },
    [tasks],
  )

  const getTask = useCallback(
    (taskId: string) => {
      return tasks.find((t) => t.id === taskId) ?? null
    },
    [tasks],
  )

  // Flattened task list (depth-first pre-order, respecting expand/collapse)
  // Can be improved by
  // - Consuming tasks as pushing to the array
  // - Manage ordering and depth separately from the task state.
  const getFlattenedTasks = useCallback((): FlatTask[] => {
    const result: FlatTask[] = []
    const walk = (parentId: string | null, depth: number) => {
      const children = tasks
        .filter((t) => t.parentTaskId === parentId)
        .sort((a, b) => a.position - b.position)
      for (const child of children) {
        result.push({ task: child, depth })
        walk(child.id, depth + 1)
      }
    }
    walk(null, 0)
    return result
  }, [tasks])

  // Tree navigation helpers (depth-first pre-order)
  const getDeepestLastDescendant = useCallback(
    (taskId: string): Task => {
      const children = tasks
        .filter((t) => t.parentTaskId === taskId)
        .sort((a, b) => a.position - b.position)
      if (children.length === 0) {
        return tasks.find((t) => t.id === taskId)!
      }
      return getDeepestLastDescendant(children[children.length - 1].id)
    },
    [tasks],
  )

  const getNextVisibleTask = useCallback(
    (taskId: string): Task | null => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return null

      // First child
      const children = tasks
        .filter((t) => t.parentTaskId === taskId)
        .sort((a, b) => a.position - b.position)
      if (children.length > 0) return children[0]

      // Next sibling, or walk up to find ancestor's next sibling
      let current: Task | null = task
      while (current) {
        const nextSib = getNextSibling(current.id)
        if (nextSib) return nextSib
        current = current.parentTaskId
          ? (tasks.find((t) => t.id === current!.parentTaskId) ?? null)
          : null
      }

      return null
    },
    [tasks, getNextSibling],
  )

  const getPreviousVisibleTask = useCallback(
    (taskId: string): Task | null => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return null

      // Previous sibling's deepest last descendant
      const prevSib = getPreviousSibling(taskId)
      if (prevSib) return getDeepestLastDescendant(prevSib.id)

      // Parent
      if (task.parentTaskId) {
        return tasks.find((t) => t.id === task.parentTaskId) ?? null
      }

      return null
    },
    [tasks, getPreviousSibling, getDeepestLastDescendant],
  )

  // Dialog creation
  const openNewTaskItem = useCallback(
    (parentTaskId: string | null, afterTaskId: string | null) => {
      setNewTaskItemState({
        parentTaskId,
        afterTaskId,
        previousFocusedTaskId: focusedTaskId,
      })
      setFocusedTaskId(null)
    },
    [focusedTaskId],
  )

  const closeNewTaskItem = useCallback(() => {
    setNewTaskItemState(null)
  }, [])

  const updateNewTaskItemAfterTaskId = useCallback((afterTaskId: string) => {
    setNewTaskItemState((prev) => (prev ? { ...prev, afterTaskId } : prev))
  }, [])

  // Operations
  const createTask = useCallback(
    async (
      name: string,
      note: string | null,
      parentTaskId: string | null,
      position?: number,
    ) => {
      try {
        const result = await createTaskMutation.mutateAsync({
          name,
          note,
          parentTaskId,
          position,
        })
        return result.id
      } catch {
        return null
      }
    },
    [createTaskMutation],
  )

  const updateTask = useCallback(
    async (taskId: string, name: string) => {
      await updateTaskMutation.mutateAsync({ taskId, name })
    },
    [updateTaskMutation],
  )

  const updateTaskNote = useCallback(
    async (taskId: string, note: string | null) => {
      await updateTaskNoteMutation.mutateAsync({ taskId, note })
    },
    [updateTaskNoteMutation],
  )

  const setTaskDone = useCallback(
    async (taskId: string, done: boolean) => {
      await setTaskDoneMutation.mutateAsync({ taskId, done })
    },
    [setTaskDoneMutation],
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      await deleteTaskMutation.mutateAsync(taskId)
    },
    [deleteTaskMutation],
  )

  const createTaskBelow = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      openNewTaskItem(task.parentTaskId, taskId)
    },
    [tasks, openNewTaskItem],
  )

  const indentTask = useCallback(
    async (taskId: string) => {
      const previousSibling = getPreviousSibling(taskId)
      if (!previousSibling) return false

      // Move task to become last child of previous sibling
      const newSiblings = getSubtasks(previousSibling.id)
      const newPosition = newSiblings.length

      try {
        await moveTaskMutation.mutateAsync({
          taskId,
          newParentTaskId: previousSibling.id,
          newPosition,
        })
        return true
      } catch {
        return false
      }
    },
    [getPreviousSibling, getSubtasks, moveTaskMutation],
  )

  const outdentTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task || !task.parentTaskId) return false

      const parent = getParent(taskId)
      if (!parent) return false

      // Move task to become sibling of parent, positioned after parent
      const newPosition = parent.position + 1

      try {
        await moveTaskMutation.mutateAsync({
          taskId,
          newParentTaskId: parent.parentTaskId,
          newPosition,
        })
        return true
      } catch {
        return false
      }
    },
    [tasks, getParent, moveTaskMutation],
  )

  const moveUp = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return false

      const previousSibling = getPreviousSibling(taskId)
      if (!previousSibling) return false

      try {
        await moveTaskMutation.mutateAsync({
          taskId,
          newParentTaskId: task.parentTaskId,
          newPosition: previousSibling.position,
        })
        return true
      } catch {
        return false
      }
    },
    [tasks, getPreviousSibling, moveTaskMutation],
  )

  const moveDown = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return false

      const nextSibling = getNextSibling(taskId)
      if (!nextSibling) return false

      try {
        await moveTaskMutation.mutateAsync({
          taskId,
          newParentTaskId: task.parentTaskId,
          newPosition: nextSibling.position,
        })
        return true
      } catch {
        return false
      }
    },
    [tasks, getNextSibling, moveTaskMutation],
  )

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      isLoading,
      isListFocused,
      setIsListFocused,
      focusedTaskId,
      setFocusedTaskId,
      newTaskItemState,
      openNewTaskItem,
      closeNewTaskItem,
      updateNewTaskItemAfterTaskId,
      getFlattenedTasks,
      getRootTasks,
      getSubtasks,
      getSiblings,
      getPreviousSibling,
      getNextSibling,
      getParent,
      getTask,
      getNextVisibleTask,
      getPreviousVisibleTask,
      createTask,
      updateTask,
      updateTaskNote,
      setTaskDone,
      deleteTask,
      createTaskBelow,
      indentTask,
      outdentTask,
      moveUp,
      moveDown,
    }),
    [
      tasks,
      isLoading,
      isListFocused,
      focusedTaskId,
      newTaskItemState,
      openNewTaskItem,
      closeNewTaskItem,
      updateNewTaskItemAfterTaskId,
      getFlattenedTasks,
      getRootTasks,
      getSubtasks,
      getSiblings,
      getPreviousSibling,
      getNextSibling,
      getParent,
      getTask,
      getNextVisibleTask,
      getPreviousVisibleTask,
      createTask,
      updateTask,
      updateTaskNote,
      setTaskDone,
      deleteTask,
      createTaskBelow,
      indentTask,
      outdentTask,
      moveUp,
      moveDown,
    ],
  )

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}
