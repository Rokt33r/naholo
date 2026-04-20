'use client'

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { cn } from '@/lib/utils'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { useObjectiveContext } from './objective-context'
import { MarkdownView } from '@/components/ui/markdown-view'
import type { Objective } from '@/hooks/use-objectives'

type ObjectiveNoteProps = {
  objective: Objective
  isFocused: boolean
  isEditingNote: boolean
  setIsEditingNote: (editing: boolean) => void
  onStartEditingName: () => void
  rowRef: RefObject<HTMLDivElement | null>
}

export function ObjectiveNote({
  objective,
  isFocused,
  isEditingNote,
  setIsEditingNote,
  onStartEditingName,
  rowRef,
}: ObjectiveNoteProps) {
  const { updateObjectiveNote } = useObjectiveContext()

  const [noteContent, setNoteContent] = useState(objective.note ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)
  const skipBlurSaveRef = useRef(false)

  // Sync noteContent when objective.note changes externally
  useEffect(() => {
    if (!isEditingNote) {
      setNoteContent(objective.note ?? '')
    }
  }, [objective.note, isEditingNote])

  // Focus note textarea when editing starts
  useEffect(() => {
    if (isEditingNote && noteTextareaRef.current) {
      noteTextareaRef.current.focus()
      noteTextareaRef.current.setSelectionRange(
        noteContent.length,
        noteContent.length,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingNote])

  const handleSaveNote = async () => {
    const trimmed = noteContent.trim()
    const newNote = trimmed || null
    if (newNote !== objective.note) {
      setIsLoading(true)
      try {
        await updateObjectiveNote(objective.id, newNote)
      } finally {
        setIsLoading(false)
      }
    }
    setIsEditingNote(false)
  }

  const handleNoteKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = noteContent.trim()
      const newNote = trimmed || null
      if (newNote !== objective.note) {
        updateObjectiveNote(objective.id, newNote)
      }
      setIsEditingNote(false)
      rowRef.current?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = noteContent.trim()
      const newNote = trimmed || null
      if (newNote !== objective.note) {
        updateObjectiveNote(objective.id, newNote)
      }
      setIsEditingNote(false)
      onStartEditingName()
    }
  }

  const showTextarea = isEditingNote || (isFocused && !objective.note)

  return (
    <>
      {/* Markdown section — animated */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          objective.note && !isEditingNote
            ? 'grid-rows-[1fr]'
            : 'grid-rows-[0fr]',
        )}
      >
        <div className='overflow-hidden'>
          <div
            onDoubleClick={() => {
              if (isFocused) {
                setIsEditingNote(true)
              }
            }}
            className='px-2 py-1 text-muted-foreground'
          >
            <MarkdownView className='text-sm py-[3px] prose-muted'>
              {objective.note ?? ''}
            </MarkdownView>
          </div>
        </div>
      </div>

      {/* Textarea section — animated */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          showTextarea ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className='overflow-hidden'>
          <div className='px-2 py-1'>
            <AutoResizeTextarea
              rows={1}
              ref={noteTextareaRef}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onBlur={() => {
                if (skipBlurSaveRef.current) {
                  skipBlurSaveRef.current = false
                  return
                }
                handleSaveNote()
              }}
              onKeyDown={handleNoteKeyDown}
              placeholder='Objective note... (Markdown supported)'
              className='w-full resize-none rounded text-sm text-muted-foreground outline-none placeholder:text-muted-foreground'
            />
          </div>
        </div>
      </div>
    </>
  )
}
