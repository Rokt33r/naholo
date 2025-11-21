'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LogItem } from './log-item'
import { useAction } from '@/lib/use-action'
import { createLogAction } from '@/app/app/actions'
import { ButtonGroup } from '../ui/button-group'
import { useCloseIssue, useReopenIssue } from '@/hooks/use-issues'

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
  const [message, setMessage] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { execute: createLog, loading: createLoading } =
    useAction(createLogAction)
  const { closeIssue } = useCloseIssue()
  const { reopenIssue } = useReopenIssue()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  const handleSendMessage = async () => {
    if (message.trim()) {
      const result = await createLog(projectId, issueId, message.trim())
      if (result.success) {
        setMessage('')
      } else {
        alert('Failed to send message: ' + result.error.message)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClose = async () => {
    const trimmedMessage = message.trim()

    // If there's content, create log first
    if (trimmedMessage) {
      const result = await createLog(projectId, issueId, trimmedMessage)
      if (!result.success) {
        alert('Failed to send message: ' + result.error.message)
        return
      }
      setMessage('')
    }

    // Then close the issue
    setIsClosing(true)
    try {
      await closeIssue(projectId, issueId)
    } finally {
      setIsClosing(false)
    }
  }

  const handleReopen = async () => {
    setIsReopening(true)
    try {
      await reopenIssue(projectId, issueId)
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
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type a message... (Shift+Enter for new line)'
            className='min-h-[80px] flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400'
            disabled={createLoading}
          />
        </div>

        <div className='flex place-content-between mt-2'>
          <div className='flex'>
            <ButtonGroup>
              <Button>Log Mode</Button>
              <Button>Task Mode</Button>
              <Button>AI Mode</Button>
            </ButtonGroup>
          </div>
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
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
