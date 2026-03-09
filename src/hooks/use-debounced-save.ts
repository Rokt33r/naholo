import { useState, useRef, useCallback, useEffect } from 'react'

export type DebouncedSaveState = 'idle' | 'debouncing' | 'saving'

type UseDebouncedSaveOptions = {
  noteId: string
  initialContent: string
  delay?: number
  onSave: (content: string) => Promise<void>
}

export function useDebouncedSave({
  noteId,
  initialContent,
  delay = 5000,
  onSave,
}: UseDebouncedSaveOptions) {
  const [content, setContentState] = useState(initialContent)
  const [saveState, setSaveState] = useState<DebouncedSaveState>('idle')

  const lastSavedRef = useRef(initialContent)
  const pendingContentRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  // Snapshot of onSave captured at setContent time, so flush always
  // targets the note that was being edited (not the newly switched-to note)
  const capturedSaveRef = useRef(onSave)

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const pending = pendingContentRef.current
    if (pending !== null && pending !== lastSavedRef.current) {
      const saveFn = capturedSaveRef.current
      pendingContentRef.current = null
      lastSavedRef.current = pending
      setSaveState('saving')
      saveFn(pending).finally(() => {
        setSaveState('idle')
      })
    }
  }, [])

  const setContent = useCallback(
    (value: string) => {
      setContentState(value)

      if (value === lastSavedRef.current) {
        // Content reverted to last saved — cancel pending
        pendingContentRef.current = null
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        setSaveState('idle')
        return
      }

      pendingContentRef.current = value
      capturedSaveRef.current = onSaveRef.current
      setSaveState('debouncing')

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        const pending = pendingContentRef.current
        if (pending !== null && pending !== lastSavedRef.current) {
          const saveFn = capturedSaveRef.current
          pendingContentRef.current = null
          lastSavedRef.current = pending
          setSaveState('saving')
          saveFn(pending).finally(() => {
            setSaveState('idle')
          })
        }
      }, delay)
    },
    [delay],
  )

  // Reset on noteId change — flush previous, reset to new content
  useEffect(() => {
    flush()
    setContentState(initialContent)
    lastSavedRef.current = initialContent
    pendingContentRef.current = null
    setSaveState('idle')
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const pending = pendingContentRef.current
      if (pending !== null && pending !== lastSavedRef.current) {
        pendingContentRef.current = null
        lastSavedRef.current = pending
        capturedSaveRef.current(pending)
      }
    }
  }, [])

  return { content, setContent, saveState, flush }
}
