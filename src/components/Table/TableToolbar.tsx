"use client"

import * as React from "react"
import { Search, X, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FilterConfig } from "./types"

interface TableToolbarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filterConfig?: FilterConfig[]
  filterValues?: Record<string, string>
  onFilterChange?: (filterId: string, value: string) => void
  toolbarActions?: React.ReactNode
  showAddButton?: boolean
  onAdd?: () => void
  addButtonLabel?: string
}

export function TableToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filterConfig = [],
  filterValues = {},
  onFilterChange,
  toolbarActions,
  showAddButton = false,
  onAdd,
  addButtonLabel = "Add",
}: TableToolbarProps) {
  const hasFilters = filterConfig.length > 0
  const hasSearch = onSearchChange !== undefined

  if (!hasSearch && !hasFilters && !toolbarActions && !showAddButton) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex flex-1 items-center gap-2">
        {hasSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 pr-9 bg-white dark:bg-input/30 border-input"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => onSearchChange?.("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {hasFilters && (
          <div className="flex items-center gap-2">
            {filterConfig.map((filter) => {
              const currentValue = filterValues[filter.id] || "__all__"
              return (
                <Select
                  key={filter.id}
                  value={currentValue}
                  onValueChange={(value) => {
                    // Use empty string to clear filter when "All" is selected
                    onFilterChange?.(filter.id, value === "__all__" ? "" : value)
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-white dark:bg-input/30">
                    <SelectValue placeholder={filter.placeholder || filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {filter.label}</SelectItem>
                    {filter.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {toolbarActions}
        {showAddButton && onAdd && (
          <Button onClick={onAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {addButtonLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

