'use client'

import { Shuffle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { LABEL_COLOR_PRESETS, randomLabelColor } from '@/lib/label-color'
import { projectLabelColorSchema } from '@/lib/project-label'
import { cn } from '@/lib/utils'

export function LabelColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  const isValid = projectLabelColorSchema.safeParse(value).success
  const nativeValue = isValid ? value.toLowerCase() : '#000000'

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-1.5'>
        {LABEL_COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type='button'
            aria-label={`Use color ${preset}`}
            onClick={() => onChange(preset)}
            style={{ backgroundColor: preset }}
            className={cn(
              'size-6 rounded-full border',
              value.toLowerCase() === preset.toLowerCase() &&
                'ring-2 ring-ring ring-offset-1',
            )}
          />
        ))}
        <button
          type='button'
          aria-label='Random color'
          onClick={() => onChange(randomLabelColor())}
          className='flex size-6 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground'
        >
          <Shuffle className='size-3' />
        </button>
      </div>
      <div className='flex items-center gap-2'>
        <input
          type='color'
          aria-label='Pick a color'
          value={nativeValue}
          onChange={(event) => onChange(event.target.value)}
          className='size-8 cursor-pointer rounded border bg-transparent p-0'
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder='#1f6feb'
          aria-invalid={!isValid}
          spellCheck={false}
          className='w-28 font-mono'
        />
      </div>
    </div>
  )
}
