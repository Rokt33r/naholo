import { useState, useRef, useCallback, useEffect } from 'react'

export type DebouncedSaveState = 'idle' | 'debouncing' | 'saving'

type NoteEntry = {
  content: string
  lastSaved: string
  timer: ReturnType<typeof setTimeout> | null
}

type UseIssueNoteStoreOptions = {
  issueId: string
  onSave: (noteId: string, content: string) => Promise<void>
  delay?: number
}

export function useIssueNoteStore({
  issueId,
  onSave,
  delay = 5000,
}: UseIssueNoteStoreOptions) {
  const [saveStates, setSaveStates] = useState<
    Record<string, DebouncedSaveState>
  >({})
  const entriesRef = useRef(new Map<string, NoteEntry>())
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const setSaveState = useCallback(
    (noteId: string, state: DebouncedSaveState) => {
      setSaveStates((prev) => {
        if (prev[noteId] === state) return prev
        return { ...prev, [noteId]: state }
      })
    },
    [],
  )

  const doSave = useCallback(
    (noteId: string, content: string) => {
      setSaveState(noteId, 'saving')
      onSaveRef.current(noteId, content).finally(() => {
        setSaveState(noteId, 'idle')
      })
    },
    [setSaveState],
  )

  const flush = useCallback(
    (noteId: string) => {
      const entry = entriesRef.current.get(noteId)
      if (!entry) return
      if (entry.timer) {
        clearTimeout(entry.timer)
        entry.timer = null
      }
      if (entry.content !== entry.lastSaved) {
        entry.lastSaved = entry.content
        doSave(noteId, entry.content)
      }
    },
    [doSave],
  )

  const flushAll = useCallback(() => {
    for (const [noteId] of entriesRef.current) {
      flush(noteId)
    }
  }, [flush])

  const initNote = useCallback((noteId: string, content: string) => {
    if (!entriesRef.current.has(noteId)) {
      entriesRef.current.set(noteId, {
        content,
        lastSaved: content,
        timer: null,
      })
    }
  }, [])

  const getContent = useCallback((noteId: string): string | undefined => {
    return entriesRef.current.get(noteId)?.content
  }, [])

  const setContent = useCallback(
    (noteId: string, value: string) => {
      const entry = entriesRef.current.get(noteId)
      if (!entry) return

      entry.content = value

      if (value === entry.lastSaved) {
        if (entry.timer) {
          clearTimeout(entry.timer)
          entry.timer = null
        }
        setSaveState(noteId, 'idle')
        return
      }

      setSaveState(noteId, 'debouncing')

      if (entry.timer) {
        clearTimeout(entry.timer)
      }
      entry.timer = setTimeout(() => {
        entry.timer = null
        if (entry.content !== entry.lastSaved) {
          entry.lastSaved = entry.content
          doSave(noteId, entry.content)
        }
      }, delay)
    },
    [delay, doSave, setSaveState],
  )

  // Flush all and reset on issueId change
  const prevIssueIdRef = useRef(issueId)
  useEffect(() => {
    if (prevIssueIdRef.current !== issueId) {
      for (const [noteId, entry] of entriesRef.current) {
        if (entry.timer) {
          clearTimeout(entry.timer)
          entry.timer = null
        }
        if (entry.content !== entry.lastSaved) {
          entry.lastSaved = entry.content
          onSaveRef.current(noteId, entry.content)
        }
      }
      entriesRef.current.clear()
      setSaveStates({})
      prevIssueIdRef.current = issueId
    }
  }, [issueId])

  // Flush on unmount
  useEffect(() => {
    return () => {
      for (const [noteId, entry] of entriesRef.current) {
        if (entry.timer) {
          clearTimeout(entry.timer)
          entry.timer = null
        }
        if (entry.content !== entry.lastSaved) {
          onSaveRef.current(noteId, entry.content)
        }
      }
    }
  }, [])

  return { setContent, getContent, flush, flushAll, initNote, saveStates }
}
