"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BulkAction } from "./types"
import { cn } from "@/lib/utils"

interface BulkActionsBarProps<TData> {
  selectedCount: number
  bulkActions: BulkAction<TData>[]
  selectedRows: TData[]
  onClearSelection: () => void
}

export function BulkActionsBar<TData>({
  selectedCount,
  bulkActions,
  selectedRows,
  onClearSelection,
}: BulkActionsBarProps<TData>) {
  if (selectedCount === 0 || bulkActions.length === 0) {
    return null
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="font-semibold bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
          {selectedCount} {selectedCount === 1 ? "row" : "rows"} selected
        </Badge>
        <div className="flex items-center gap-2">
          {bulkActions.map((action, index) => {
            const isDisabled = action.disabled ? action.disabled(selectedRows) : false
            
            return (
              <Button
                key={index}
                variant={action.variant || "outline"}
                size="sm"
                onClick={() => action.onClick(selectedRows)}
                disabled={isDisabled}
                className="gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            )
          })}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        Clear selection
      </Button>
    </div>
  )
}

