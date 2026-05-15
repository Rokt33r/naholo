'use client'

import { CornerDownLeft, CircleCheck, CircleDot } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { Button } from '@/components/ui/button'
import { OperationLogItem } from './operation-log-item'
import { useCloseOperation, useReopenOperation } from '@/hooks/use-operations'
import {
  useCreateOperationLog,
  type OperationLog,
} from '@/hooks/use-operation-logs'
import { useProjectContext } from '@/components/app/project-context'
import { useLocalStorage } from '@/hooks/use-local-storage'

type OperationLogsListProps = {
  projectSlug: string
  operationNumber: number
  operationLogs: OperationLog[]
  isClosed: boolean
}

export function OperationLogsList({
  projectSlug,
  operationNumber,
  operationLogs,
  isClosed,
}: OperationLogsListProps) {
  const [message, setMessage] = useLocalStorage(
    `log-draft:${projectSlug}:${operationNumber}`,
    '',
  )
  const [isClosing, setIsClosing] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { currentOperator } = useProjectContext()

  const { mutateAsync: createLog, isPending: createLoading } =
    useCreateOperationLog(projectSlug, operationNumber, currentOperator)
  const { mutateAsync: closeOperation } = useCloseOperation(
    projectSlug,
    operationNumber,
  )
  const { mutateAsync: reopenOperation } = useReopenOperation(
    projectSlug,
    operationNumber,
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [operationLogs])

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

    // Then close the operation
    setIsClosing(true)
    try {
      await closeOperation()
    } finally {
      setIsClosing(false)
    }
  }

  const handleReopen = async () => {
    setIsReopening(true)
    try {
      await reopenOperation()
    } finally {
      setIsReopening(false)
    }
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Messages */}
      <div className='w-full flex-1 space-y-1 overflow-y-auto p-4'>
        {operationLogs.length === 0 ? (
          <div className='py-8 text-center text-sm text-zinc-500'>
            No messages yet. Start a discussion below.
          </div>
        ) : (
          <>
            {operationLogs.map((log) => (
              <OperationLogItem
                key={log.id}
                log={log}
                projectSlug={projectSlug}
                operationNumber={operationNumber}
                isOwn={log.projectOperator?.id === currentOperator.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className='w-full border-t p-2'>
        <div className='relative rounded-md border focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]'>
          <AutoResizeTextarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type a message... (Shift+Enter for new line)'
            className='min-h-[80px] max-h-[60vh] w-full resize-none overflow-y-auto bg-transparent px-3 py-2 pb-10 text-sm outline-none'
          />
          <div className='absolute right-2 bottom-2 flex gap-1'>
            {isClosed ? (
              <Button
                variant='ghost'
                size='icon'
                onClick={handleReopen}
                disabled={isReopening}
                title='Reopen operation'
              >
                <CircleDot className='size-5 text-green-600' />
              </Button>
            ) : (
              <Button
                variant='ghost'
                onClick={handleClose}
                disabled={isClosing}
              >
                <CircleCheck className='size-5 text-purple-600' />
                {message.trim() ? 'Close with log' : 'Close'}
              </Button>
            )}
            <Button
              size='icon'
              onClick={handleSendMessage}
              disabled={!message.trim() || createLoading}
              title='Send (Enter)'
            >
              <CornerDownLeft className='size-5' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
