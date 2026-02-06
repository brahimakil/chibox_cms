'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

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

interface PaginatedComboboxProps {
  fetchOptions: (search: string, page: number, limit: number) => Promise<{
    options: ComboboxOption[]
    pagination: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
  }>
  value?: string
  onValueChange?: (value: string | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  limit?: number
  initialSelectedOption?: ComboboxOption | null
}

export function PaginatedCombobox({
  fetchOptions,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No option found.',
  disabled = false,
  className,
  limit = 50,
  initialSelectedOption,
}: PaginatedComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [options, setOptions] = React.useState<ComboboxOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)
  const [selectedOption, setSelectedOption] = React.useState<ComboboxOption | null>(initialSelectedOption || null)

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch initial options when dialog opens or search changes
  React.useEffect(() => {
    if (!open) return

    const loadOptions = async () => {
      setIsLoading(true)
      setCurrentPage(1)
      try {
        const result = await fetchOptions(debouncedSearch, 1, limit)
        setOptions(result.options)
        setHasMore(result.pagination.hasMore)
        // Find and set selected option
        if (value) {
          const found = result.options.find(opt => opt.value === value)
          if (found) {
            setSelectedOption(found)
          } else if (!debouncedSearch) {
            // If we have a value but it's not in first page and no search,
            // try to search for it specifically to find it
            // This handles the case where editing a notification with a value not in first 50
            try {
              const searchResult = await fetchOptions(value, 1, limit)
              const foundInSearch = searchResult.options.find(opt => opt.value === value)
              if (foundInSearch) {
                setSelectedOption(foundInSearch)
                // Add it to options if not already there
                setOptions(prev => {
                  if (!prev.find(opt => opt.value === value)) {
                    return [foundInSearch, ...prev]
                  }
                  return prev
                })
              } else {
                // Still not found, use placeholder
                setSelectedOption({ value, label: `Item ${value}` })
              }
            } catch {
              // Fallback to placeholder
              setSelectedOption({ value, label: `Item ${value}` })
            }
          } else {
            // Searching but value not found
            setSelectedOption({ value, label: `Item ${value}` })
          }
        } else {
          setSelectedOption(null)
        }
      } catch (error) {
        console.error('Error fetching options:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOptions()
  }, [open, debouncedSearch, fetchOptions, limit, value])

  // Load more options when scrolling near bottom
  const loadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore || !open) return

    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const result = await fetchOptions(debouncedSearch, nextPage, limit)
      setOptions(prev => [...prev, ...result.options])
      setHasMore(result.pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (error) {
      console.error('Error loading more options:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, open, currentPage, debouncedSearch, fetchOptions, limit])

  // Handle scroll to load more
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
    // Load more when within 100px of bottom
    if (scrollBottom < 100 && hasMore && !isLoadingMore) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setCurrentPage(1)
    }
  }, [open])

  // Update selectedOption when initialSelectedOption changes
  React.useEffect(() => {
    if (initialSelectedOption && initialSelectedOption.value === value) {
      setSelectedOption(initialSelectedOption)
    } else if (!value) {
      setSelectedOption(null)
    } else if (!initialSelectedOption && value) {
      // If we have a value but no initialSelectedOption, keep current selectedOption
      // This prevents clearing it when initialSelectedOption becomes null temporarily
    }
  }, [initialSelectedOption, value])

  // Find selected option from current options
  const displayOption = React.useMemo(() => {
    if (!value) return null
    // Priority: options list > selectedOption > initialSelectedOption
    const foundInOptions = options.find(opt => opt.value === value)
    if (foundInOptions) return foundInOptions
    if (selectedOption && selectedOption.value === value) return selectedOption
    if (initialSelectedOption && initialSelectedOption.value === value) return initialSelectedOption
    return null
  }, [value, options, selectedOption, initialSelectedOption])

  // Fix wheel scrolling - ensure CommandList receives wheel events
  React.useEffect(() => {
    if (!open) return

    let commandList: HTMLElement | null = null
    let wheelHandler: ((e: WheelEvent) => void) | null = null

    const findAndFixScroll = () => {
      commandList = document.querySelector('[data-slot="command-list"]') as HTMLElement
      if (commandList && !wheelHandler) {
        commandList.style.setProperty('overflow-y', 'auto', 'important')
        commandList.style.setProperty('max-height', '300px', 'important')
        commandList.style.setProperty('overscroll-behavior', 'contain', 'important')
        commandList.style.setProperty('pointer-events', 'auto', 'important')
        
        wheelHandler = (e: WheelEvent) => {
          e.stopPropagation()
        }
        
        commandList.addEventListener('wheel', wheelHandler, { passive: true })
      }
    }

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
          {displayOption ? displayOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-(--radix-popover-trigger-width) p-0" 
        align="start"
        onInteractOutside={(e) => {
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
            onScroll={handleScroll}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        const newValue = value === option.value ? undefined : option.value
                        onValueChange?.(newValue)
                        setSelectedOption(option)
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
                  {isLoadingMore && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
                    </div>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

