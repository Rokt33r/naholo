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
import { useTaskContext } from './task-context'
import { MarkdownView } from '@/components/ui/markdown-view'
import type { Task } from '@/hooks/use-tasks'

type TaskNoteProps = {
  task: Task
  isFocused: boolean
  isEditingNote: boolean
  setIsEditingNote: (editing: boolean) => void
  onStartEditingName: () => void
  rowRef: RefObject<HTMLDivElement | null>
}

export function TaskNote({
  task,
  isFocused,
  isEditingNote,
  setIsEditingNote,
  onStartEditingName,
  rowRef,
}: TaskNoteProps) {
  const { updateTaskNote } = useTaskContext()

  const [noteContent, setNoteContent] = useState(task.note ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)
  const skipBlurSaveRef = useRef(false)

  // Sync noteContent when task.note changes externally
  useEffect(() => {
    if (!isEditingNote) {
      setNoteContent(task.note ?? '')
    }
  }, [task.note, isEditingNote])

  // Focus note textarea when editing starts
  useEffect(() => {
    if (isEditingNote && noteTextareaRef.current) {
      noteTextareaRef.current.focus()
      noteTextareaRef.current.setSelectionRange(
        noteContent.length,
        noteContent.length,
      )
    }
  }, [isEditingNote, noteContent.length])

  const handleSaveNote = async () => {
    const trimmed = noteContent.trim()
    const newNote = trimmed || null
    if (newNote !== task.note) {
      setIsLoading(true)
      try {
        await updateTaskNote(task.id, newNote)
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
      if (newNote !== task.note) {
        updateTaskNote(task.id, newNote)
      }
      setIsEditingNote(false)
      rowRef.current?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = noteContent.trim()
      const newNote = trimmed || null
      if (newNote !== task.note) {
        updateTaskNote(task.id, newNote)
      }
      setIsEditingNote(false)
      onStartEditingName()
    }
  }

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-out',
        isFocused ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className='overflow-hidden'>
        <div className='px-2 pb-2 pt-1'>
          {isEditingNote ? (
            <AutoResizeTextarea
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
              placeholder='Task note... (Markdown supported)'
              className='min-h-[60px] w-full resize-none rounded text-sm outline-none placeholder:text-muted-foreground/50'
            />
          ) : task.note ? (
            <div
              onClick={() => setIsEditingNote(true)}
              className='cursor-text rounded hover:bg-zinc-50 dark:hover:bg-zinc-900'
            >
              <MarkdownView className='text-sm'>{task.note}</MarkdownView>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingNote(true)}
              className='cursor-text text-sm text-muted-foreground/50'
            >
              Task note...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
