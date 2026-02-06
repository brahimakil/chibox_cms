'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No option found.',
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedOption = options.find((option) => option.value === value)

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const searchLower = search.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    )
  }, [options, search])

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  // Fix wheel scrolling - ensure CommandList receives wheel events
  React.useEffect(() => {
    if (!open) return

    let commandList: HTMLElement | null = null
    let wheelHandler: ((e: WheelEvent) => void) | null = null

    const findAndFixScroll = () => {
      commandList = document.querySelector('[data-slot="command-list"]') as HTMLElement
      if (commandList && !wheelHandler) {
        // Force scrollable styles
        commandList.style.setProperty('overflow-y', 'auto', 'important')
        commandList.style.setProperty('max-height', '300px', 'important')
        commandList.style.setProperty('overscroll-behavior', 'contain', 'important')
        
        // Ensure pointer events work
        commandList.style.setProperty('pointer-events', 'auto', 'important')
        
        // Add wheel event handler directly to CommandList to ensure scrolling works
        wheelHandler = (e: WheelEvent) => {
          // Stop propagation to prevent Popover from interfering
          e.stopPropagation()
          // Don't prevent default - let native scroll work
        }
        
        commandList.addEventListener('wheel', wheelHandler, { passive: true })
      }
    }

    // Try immediately and after delays to catch the element
    findAndFixScroll()
    const timer = setTimeout(findAndFixScroll, 50)
    const timer2 = setTimeout(findAndFixScroll, 200)

    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
      if (commandList && wheelHandler) {
        commandList.removeEventListener('wheel', wheelHandler)
      }
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between bg-background', className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-(--radix-popover-trigger-width) p-0" 
        align="start"
        onInteractOutside={(e) => {
          // Prevent closing when clicking on scrollbar
          const target = e.target as HTMLElement
          if (target.closest('[data-slot="command-list"]')) {
            e.preventDefault()
          }
        }}
      >
        <Command shouldFilter={false} className="flex flex-col max-h-[300px]">
          <CommandInput 
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList 
            className="flex-1 overflow-y-auto overscroll-contain min-h-0"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    const newValue = value === option.value ? undefined : option.value
                    onValueChange?.(newValue)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

