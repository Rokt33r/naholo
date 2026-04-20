import { useState, useRef, useCallback, useEffect } from 'react'

export type DebouncedSaveState = 'idle' | 'debouncing' | 'saving'

type NoteEntry = {
  content: string
  lastSaved: string
  timer: ReturnType<typeof setTimeout> | null
}

type UseOperationNoteStoreOptions = {
  operationId: string
  onSave: (noteName: string, content: string) => Promise<void>
  delay?: number
}

export function useOperationNoteStore({
  operationId,
  onSave,
  delay = 5000,
}: UseOperationNoteStoreOptions) {
  const [saveStates, setSaveStates] = useState<
    Record<string, DebouncedSaveState>
  >({})
  const entriesRef = useRef(new Map<string, NoteEntry>())
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const setSaveState = useCallback(
    (noteName: string, state: DebouncedSaveState) => {
      setSaveStates((prev) => {
        if (prev[noteName] === state) return prev
        return { ...prev, [noteName]: state }
      })
    },
    [],
  )

  const doSave = useCallback(
    (noteName: string, content: string) => {
      setSaveState(noteName, 'saving')
      onSaveRef.current(noteName, content).finally(() => {
        setSaveState(noteName, 'idle')
      })
    },
    [setSaveState],
  )

  const flush = useCallback(
    (noteName: string) => {
      const entry = entriesRef.current.get(noteName)
      if (!entry) return
      if (entry.timer) {
        clearTimeout(entry.timer)
        entry.timer = null
      }
      if (entry.content !== entry.lastSaved) {
        entry.lastSaved = entry.content
        doSave(noteName, entry.content)
      }
    },
    [doSave],
  )

  const flushAll = useCallback(() => {
    for (const [noteName] of entriesRef.current) {
      flush(noteName)
    }
  }, [flush])

  const initNote = useCallback((noteName: string, content: string) => {
    if (!entriesRef.current.has(noteName)) {
      entriesRef.current.set(noteName, {
        content,
        lastSaved: content,
        timer: null,
      })
    }
  }, [])

  const getContent = useCallback((noteName: string): string | undefined => {
    return entriesRef.current.get(noteName)?.content
  }, [])

  const setContent = useCallback(
    (noteName: string, value: string) => {
      const entry = entriesRef.current.get(noteName)
      if (!entry) return

      entry.content = value

      if (value === entry.lastSaved) {
        if (entry.timer) {
          clearTimeout(entry.timer)
          entry.timer = null
        }
        setSaveState(noteName, 'idle')
        return
      }

      setSaveState(noteName, 'debouncing')

      if (entry.timer) {
        clearTimeout(entry.timer)
      }
      entry.timer = setTimeout(() => {
        entry.timer = null
        if (entry.content !== entry.lastSaved) {
          entry.lastSaved = entry.content
          doSave(noteName, entry.content)
        }
      }, delay)
    },
    [delay, doSave, setSaveState],
  )

  // Flush all and reset on operationId change
  const prevOperationIdRef = useRef(operationId)
  useEffect(() => {
    if (prevOperationIdRef.current !== operationId) {
      for (const [noteName, entry] of entriesRef.current) {
        if (entry.timer) {
          clearTimeout(entry.timer)
          entry.timer = null
        }
        if (entry.content !== entry.lastSaved) {
          entry.lastSaved = entry.content
          onSaveRef.current(noteName, entry.content)
        }
      }
      entriesRef.current.clear()
      setSaveStates({})
      prevOperationIdRef.current = operationId
    }
  }, [operationId])

  // Flush on unmount
  useEffect(() => {
    return () => {
      for (const [noteName, entry] of entriesRef.current) {
        if (entry.timer) {
          clearTimeout(entry.timer)
          entry.timer = null
        }
        if (entry.content !== entry.lastSaved) {
          onSaveRef.current(noteName, entry.content)
        }
      }
    }
  }, [])

  return { setContent, getContent, flush, flushAll, initNote, saveStates }
}
