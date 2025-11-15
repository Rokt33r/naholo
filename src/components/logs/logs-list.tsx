'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogItem } from './log-item'
import { useAction } from '@/lib/use-action'
import { createLogAction } from '@/app/app/actions'

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
}

export function LogsList({ projectId, issueId, logs }: LogsListProps) {
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { execute: createLog, loading: createLoading } =
    useAction(createLogAction)

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

  return (
    <div className='flex h-full flex-col'>
      <div className='border-b p-4'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-500'>
          Logs
        </h2>
      </div>

      {/* Messages */}
      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
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
      <div className='border-t p-4'>
        <div className='flex gap-2'>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type a message... (Shift+Enter for new line)'
            className='min-h-[80px] flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400'
            disabled={createLoading}
          />
          <Button
            size='icon'
            onClick={handleSendMessage}
            disabled={!message.trim() || createLoading}
          >
            <Send className='h-4 w-4' />
          </Button>
        </div>
        <p className='mt-2 text-xs text-zinc-500'>
          Supports markdown formatting
        </p>
      </div>
    </div>
  )
}
