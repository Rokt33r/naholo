'use client'

import { CornerDownLeft } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { Button } from '@/components/ui/button'
import { LogItem } from './log-item'
import { ButtonGroup } from '../ui/button-group'
import { useCloseIssue, useReopenIssue } from '@/hooks/use-issues'
import { useCreateLog } from '@/hooks/use-logs'

type Log = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type LogsListProps = {
  projectId: string
  issueId: string
  logs: Log[]
  isClosed: boolean
}

export function LogsList({
  projectId,
  issueId,
  logs,
  isClosed,
}: LogsListProps) {
  const [mode, setMode] = useState<'log' | 'task' | 'ai'>('log')
  const [message, setMessage] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { mutateAsync: createLog, isPending: createLoading } = useCreateLog(
    projectId,
    issueId,
  )
  const { mutateAsync: closeIssue } = useCloseIssue(projectId, issueId)
  const { mutateAsync: reopenIssue } = useReopenIssue(projectId, issueId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  const handleSendMessage = async () => {
    let newMessage = message.trim()
    setMessage('')
    if (message.trim()) {
      try {
        await createLog(newMessage)
      } catch (error) {
        console.error('Failed to create log:', error)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClose = async () => {
    const trimmedMessage = message.trim()

    // If there's content, create log first
    if (trimmedMessage) {
      try {
        await createLog(trimmedMessage)
        setMessage('')
      } catch (error) {
        console.error('Failed to create log:', error)
        return
      }
    }

    // Then close the issue
    setIsClosing(true)
    try {
      await closeIssue()
    } finally {
      setIsClosing(false)
    }
  }

  const handleReopen = async () => {
    setIsReopening(true)
    try {
      await reopenIssue()
    } finally {
      setIsReopening(false)
    }
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Messages */}
      <div className='flex-1 space-y-1 overflow-y-auto p-4'>
        {logs.length === 0 ? (
          <div className='py-8 text-center text-sm text-zinc-500'>
            No messages yet. Start a discussion below.
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <LogItem
                key={log.id}
                log={log}
                projectId={projectId}
                issueId={issueId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className='border-t p-2'>
        <div className='flex'>
          <AutoResizeTextarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type a message... (Shift+Enter for new line)'
            className='min-h-[80px] flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
          />
        </div>

        <div className='flex place-content-between mt-2'>
          <div className='flex'></div>
          <div className='flex gap-1'>
            {isClosed ? (
              <Button
                variant='secondary'
                onClick={handleReopen}
                disabled={isReopening}
              >
                {isReopening ? 'Reopening...' : 'Reopen issue'}
              </Button>
            ) : (
              <Button
                variant='secondary'
                onClick={handleClose}
                disabled={isClosing}
              >
                {isClosing
                  ? 'Closing...'
                  : message.trim()
                    ? 'Close with log'
                    : 'Close issue'}
              </Button>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || createLoading}
            >
              Send
              <CornerDownLeft className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
