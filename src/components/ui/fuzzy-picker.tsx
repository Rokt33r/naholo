'use client'

import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type FuzzyPickerOption = {
  id: string
  label: string
}

export function FuzzyPicker<T extends FuzzyPickerOption>({
  options,
  selectedIds,
  onToggle,
  trigger,
  placeholder = 'Search…',
  emptyText = 'No matches',
  renderOption,
  footer,
  align = 'start',
}: {
  options: T[]
  selectedIds: string[]
  onToggle: (option: T) => void
  trigger: ReactNode
  placeholder?: string
  emptyText?: string
  renderOption?: (option: T, selected: boolean) => ReactNode
  footer?: (query: string) => ReactNode
  align?: 'start' | 'center' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (normalized === '') {
      return options
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    )
  }, [options, query])

  const selected = new Set(selectedIds)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setActiveIndex(0)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option != null) {
        onToggle(option)
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className='w-64 p-0'>
        <div className='border-b p-2'>
          <Input
            autoFocus
            value={query}
            placeholder={placeholder}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className='max-h-64 overflow-y-auto p-1'>
          {filtered.length === 0 ? (
            <div className='px-2 py-3 text-center text-sm text-muted-foreground'>
              {emptyText}
            </div>
          ) : (
            filtered.map((option, index) => {
              const isSelected = selected.has(option.id)
              return (
                <button
                  key={option.id}
                  type='button'
                  onClick={() => onToggle(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                    index === activeIndex && 'bg-accent text-accent-foreground',
                  )}
                >
                  <span className='flex-1 truncate'>
                    {renderOption?.(option, isSelected) ?? option.label}
                  </span>
                  {isSelected ? <Check className='size-4 shrink-0' /> : null}
                </button>
              )
            })
          )}
        </div>
        {footer != null ? (
          <div className='border-t p-1'>{footer(query.trim())}</div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
