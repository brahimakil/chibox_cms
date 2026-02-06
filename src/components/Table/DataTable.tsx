"use client"

import * as React from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnDef,
  flexRender,
  Row,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  HeaderContext,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableToolbar } from "./TableToolbar"
import { TablePagination } from "./TablePagination"
import { BulkActionsBar } from "./BulkActionsBar"
import { DataTableProps } from "./types"
import { cn } from "@/lib/utils"

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  enableRowSelection = false,
  enableGlobalFilter = true,
  enableColumnFilters = true,
  enableSorting = true,
  enablePagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 50, 100],
  onRowClick,
  onSelectionChange,
  emptyMessage = "No results found.",
  loading = false,
  filterConfig = [],
  toolbarActions,
  className,
  showAddButton = false,
  onAdd,
  addButtonLabel = "Add",
  rowActions = [],
  enableRowContextMenu = true,
  bulkActions = [],
  tableHeight = "calc(100vh - 250px)",
  title,
  description,
  // Custom handlers for server-side filtering
  onSearchChange,
  searchValue: externalSearchValue,
  onFilterChange: externalFilterChange,
  filterValues: externalFilterValues,
  onColumnFilterChange,
  columnFilterValues: externalColumnFilterValues,
  // Server-side sorting
  onSortingChange,
  sortingValues: externalSortingValues,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({})
  
  // Use external column filter values if provided (server-side), otherwise use internal state (client-side)
  const currentColumnFilters = React.useMemo(() => {
    if (externalColumnFilterValues !== undefined && onColumnFilterChange) {
      // Server-side: convert external values to ColumnFiltersState format
      return Object.entries(externalColumnFilterValues)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([id, value]) => ({ id, value: String(value) }))
    }
    return columnFilters
  }, [externalColumnFilterValues, columnFilters, onColumnFilterChange])

  // Use external sorting values if provided (server-side), otherwise use internal state (client-side)
  const currentSorting = React.useMemo(() => {
    if (externalSortingValues !== undefined && onSortingChange) {
      return externalSortingValues
    }
    return sorting
  }, [externalSortingValues, sorting, onSortingChange])

  // Use external handlers if provided, otherwise use internal state
  const searchValue = externalSearchValue !== undefined ? externalSearchValue : globalFilter
  const handleSearchChange = onSearchChange || setGlobalFilter
  const handleFilterChange = externalFilterChange || ((filterId: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }))
    if (value) {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== filterId),
        { id: filterId, value },
      ])
    } else {
      setColumnFilters((prev) => prev.filter((f) => f.id !== filterId))
    }
  })
  const currentFilterValues = externalFilterValues !== undefined ? externalFilterValues : filterValues

  // Virtual scrolling ref
  const parentRef = React.useRef<HTMLDivElement>(null)
  
  // Row measurement refs for dynamic height calculation
  const rowRefs = React.useRef<Map<number, HTMLTableRowElement>>(new Map())
  const measuredHeights = React.useRef<Map<number, number>>(new Map())

  // Helper function to render context menu items
  const renderContextMenuItems = React.useCallback((row: TData) => {
    if (rowActions.length === 0) return null

    return rowActions.map((action, index) => {
      const isDisabled = action.disabled ? action.disabled(row) : false
      const isDestructive = action.variant === "destructive"
      
      return (
        <React.Fragment key={index}>
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation()
              action.onClick(row)
            }}
            variant={isDestructive ? "destructive" : "default"}
            disabled={isDisabled}
            className="gap-2"
          >
            {action.icon}
            {action.label}
          </ContextMenuItem>
          {index < rowActions.length - 1 && <ContextMenuSeparator />}
        </React.Fragment>
      )
    })
  }, [rowActions])

  // Helper function to render dropdown menu items
  const renderDropdownMenuItems = React.useCallback((row: TData) => {
    if (rowActions.length === 0) return null

    return rowActions.map((action, index) => {
      const isDisabled = action.disabled ? action.disabled(row) : false
      const isDestructive = action.variant === "destructive"
      
      return (
        <React.Fragment key={index}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              action.onClick(row)
            }}
            className={cn(
              "gap-2",
              isDestructive && "text-destructive focus:text-destructive"
            )}
            disabled={isDisabled}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
          {index < rowActions.length - 1 && <DropdownMenuSeparator />}
        </React.Fragment>
      )
    })
  }, [rowActions])

  // Add selection column if enabled
  const tableColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    let cols = columns

    // Add selection column if enabled
    if (enableRowSelection) {
      const selectionColumn: ColumnDef<TData, TValue> = {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      }
      cols = [selectionColumn, ...cols]
    }

    // Add actions column if rowActions are provided and actions column doesn't exist
    if (rowActions.length > 0 && !cols.some(col => col.id === "actions")) {
      const actionsColumn: ColumnDef<TData, TValue> = {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {renderDropdownMenuItems(row.original)}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        enableSorting: false,
      }
      cols = [...cols, actionsColumn]
    }

    return cols
  }, [columns, enableRowSelection, rowActions, renderDropdownMenuItems])

  // Add sorting icons to sortable columns
  const enhancedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableSorting) return tableColumns

    return tableColumns.map((column) => {
      // Don't add sorting to select column or columns that don't allow sorting
      if (column.id === "select" || !column.enableSorting) {
        return column
      }

      const originalHeader = column.header
      return {
        ...column,
        header: (context: HeaderContext<TData, TValue>) => {
          const isSorted = context.column.getIsSorted()
          
          // Get the header content (handle both string and function headers)
          const headerContent = typeof originalHeader === "function"
            ? originalHeader(context)
            : originalHeader

          return (
            <Button
              variant="ghost"
              onClick={() => context.column.toggleSorting()}
              className="h-8 px-2 hover:bg-muted/50 dark:hover:bg-muted/30 text-foreground hover:text-foreground font-medium"
            >
              {headerContent}
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          )
        },
      } as ColumnDef<TData, TValue>
    })
  }, [tableColumns, enableSorting])

  // Handle column filter changes - server-side or client-side
  const handleColumnFiltersChange = React.useCallback((updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
    if (onColumnFilterChange) {
      // Server-side filtering
      const newFilters = typeof updater === 'function' ? updater(currentColumnFilters) : updater
      // Call the server-side handler for each filter change
      newFilters.forEach((filter) => {
        onColumnFilterChange(filter.id, String(filter.value || ""))
      })
      // Also clear filters that were removed
      const removedFilters = currentColumnFilters.filter(
        (oldFilter) => !newFilters.some((newFilter) => newFilter.id === oldFilter.id)
      )
      removedFilters.forEach((filter) => {
        onColumnFilterChange(filter.id, "")
      })
    } else {
      // Client-side filtering
      setColumnFilters(updater)
    }
  }, [onColumnFilterChange, currentColumnFilters])

  // Handle sorting changes - server-side or client-side
  const handleSortingChange = React.useCallback((updater: SortingState | ((prev: SortingState) => SortingState)) => {
    if (onSortingChange) {
      // Server-side sorting
      const newSorting = typeof updater === 'function' ? updater(currentSorting) : updater
      onSortingChange(newSorting)
    } else {
      // Client-side sorting
      setSorting(updater)
    }
  }, [onSortingChange, currentSorting])

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    state: {
      sorting: currentSorting,
      columnFilters: currentColumnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting && !onSortingChange ? getSortedRowModel() : undefined,
    getFilteredRowModel: onColumnFilterChange ? undefined : getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
    globalFilterFn: searchKey
      ? (row, columnId, filterValue) => {
          const searchableValue = String(
            (row.original as Record<string, unknown>)[searchKey] || ""
          )
          return searchableValue.toLowerCase().includes(String(filterValue).toLowerCase())
        }
      : undefined,
  })

  // Get selected rows
  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original)

  const selectedCount = selectedRows.length

  // Handle selection changes
  React.useEffect(() => {
    if (onSelectionChange && enableRowSelection) {
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, onSelectionChange, enableRowSelection, selectedRows])

  const handleClearSelection = React.useCallback(() => {
    table.resetRowSelection()
  }, [table])

  const handleRowClick = React.useCallback(
    (row: Row<TData>) => {
      if (onRowClick) {
        onRowClick(row.original)
      }
    },
    [onRowClick]
  )

  // Get filtered/sorted rows for virtual scrolling
  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()

  // Base row height estimate for virtualization (will be refined by measurement)
  const ROW_HEIGHT = 50

  // Virtual scrolling with dynamic row measurement
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Try to get measured height first
      const measured = measuredHeights.current.get(index)
      if (measured !== undefined && measured > 0) return measured
      
      // Fall back to estimated height
      return ROW_HEIGHT
    },
    overscan: 5, // Reduced overscan for better performance during scrolling
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // Measure rows once when they first appear (not continuously to avoid scroll jank)
  React.useEffect(() => {
    if (virtualItems.length === 0 || loading) return

    // Use requestAnimationFrame to measure after render without blocking
    const rafId = requestAnimationFrame(() => {
      let hasChanges = false
      virtualItems.forEach((virtualRow) => {
        const rowElement = rowRefs.current.get(virtualRow.index)
        if (rowElement && !measuredHeights.current.has(virtualRow.index)) {
          const height = rowElement.getBoundingClientRect().height
          if (height > 0) {
            measuredHeights.current.set(virtualRow.index, height)
            hasChanges = true
          }
        }
      })

      // Only measure once if we have new measurements
      if (hasChanges) {
        virtualizer.measure()
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualItems.length, loading]) // Only measure when number of visible items changes or loading state changes

  // Clear measured heights when data changes significantly (e.g., new page, new filter results)
  React.useEffect(() => {
    // Keep measurements for indices that still exist, clear others
    const maxIndex = rows.length - 1
    const indicesToRemove: number[] = []
    measuredHeights.current.forEach((_, index) => {
      if (index > maxIndex) {
        indicesToRemove.push(index)
      }
    })
    indicesToRemove.forEach((index) => {
      measuredHeights.current.delete(index)
      rowRefs.current.delete(index)
    })
  }, [rows.length])

  // Calculate padding for virtual scroll
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0
  const paddingBottom = virtualItems.length > 0 
    ? totalSize - (virtualItems[virtualItems.length - 1]?.end || 0) 
    : 0

  return (
    <div className={cn("space-y-4", className)}>
      {/* Title and Add Button on same line */}
      {(title || showAddButton) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          {showAddButton && onAdd && (
            <Button onClick={onAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {addButtonLabel}
            </Button>
          )}
        </div>
      )}
      {(enableGlobalFilter || onSearchChange || filterConfig.length > 0 || toolbarActions) && (
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={enableGlobalFilter || onSearchChange ? handleSearchChange : undefined}
          searchPlaceholder={searchPlaceholder}
          filterConfig={filterConfig}
          filterValues={currentFilterValues}
          onFilterChange={handleFilterChange}
          toolbarActions={toolbarActions}
          showAddButton={false}
        />
      )}

      {enableRowSelection && bulkActions.length > 0 && selectedCount > 0 && (
        <BulkActionsBar
          selectedCount={selectedCount}
          bulkActions={bulkActions}
          selectedRows={selectedRows}
          onClearSelection={handleClearSelection}
        />
      )}

      <div className="rounded-md border border-border bg-card overflow-hidden flex flex-col" style={{ height: tableHeight }}>
        {/* Scrollable container for both X and Y */}
        <div 
          ref={parentRef}
          className="flex-1 overflow-auto relative [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-border/80"
          style={{ 
            scrollBehavior: 'auto', // Use 'auto' for better virtual scroll performance
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--border)) transparent',
          }}
        >
          <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
            <thead className="bg-muted dark:bg-muted/80 sticky top-0 z-10">
              {headerGroups.map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const column = header.column
                    const filterValue = externalColumnFilterValues !== undefined && onColumnFilterChange
                      ? (externalColumnFilterValues[column.id] || "")
                      : (column.getFilterValue() as string | undefined ?? "")
                    const showFilter = enableColumnFilters && 
                      column.id !== "select" &&
                      column.id !== "actions" &&
                      "accessorKey" in column.columnDef
                    
                    const headerLabel = typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id
                    
                    // Special columns get fixed widths
                    const isSelectColumn = column.id === "select"
                    const isActionsColumn = column.id === "actions"

                    return (
                      <th 
                        key={header.id} 
                        className={cn(
                          "text-left align-top bg-muted dark:bg-muted/80 px-3 py-2 text-foreground font-medium border-b border-border",
                          isSelectColumn && "w-[50px]",
                          isActionsColumn && "w-[80px]"
                        )}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center h-10 text-foreground whitespace-nowrap">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                          {showFilter && (
                            <Input
                              placeholder={`Filter ${headerLabel}...`}
                              value={filterValue ?? ""}
                              onChange={(e) => {
                                const value = e.target.value
                                if (onColumnFilterChange) {
                                  onColumnFilterChange(column.id, value)
                                } else {
                                  column.setFilterValue(value)
                                }
                              }}
                              className="h-8 w-full min-w-[80px] bg-white dark:bg-input/30 border-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="bg-card">
              {loading ? (
                Array.from({ length: Math.min(pageSize, 10) }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-border" style={{ height: ROW_HEIGHT }}>
                    {headerGroups[0]?.headers.map((header) => {
                      const isSelectColumn = header.column.id === "select"
                      const isActionsColumn = header.column.id === "actions"
                      return (
                        <td 
                          key={`skeleton-${index}-${header.id}`} 
                          className={cn(
                            "px-3 py-3",
                            isSelectColumn && "w-[50px]",
                            isActionsColumn && "w-[80px]"
                          )}
                        >
                          <Skeleton className="h-4 w-full" />
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : rows.length > 0 ? (
                <>
                  {/* Top padding row */}
                  {paddingTop > 0 && (
                    <tr>
                      <td colSpan={headerGroups[0]?.headers.length || 1} style={{ height: paddingTop, padding: 0, border: 'none' }} />
                    </tr>
                  )}
                  {/* Virtual rows */}
                  {virtualItems.map((virtualRow) => {
                    const row = rows[virtualRow.index]
                    const rowContent = (
                      <tr
                        key={row.id}
                        ref={(el) => {
                          if (el) {
                            rowRefs.current.set(virtualRow.index, el)
                          } else {
                            rowRefs.current.delete(virtualRow.index)
                          }
                        }}
                        data-index={virtualRow.index}
                        data-state={row.getIsSelected() && "selected"}
                        onClick={() => handleRowClick(row)}
                        className={cn(
                          "border-b border-border",
                          onRowClick && "cursor-pointer",
                          row.getIsSelected() 
                            ? "bg-primary/10 dark:bg-primary/20" 
                            : "hover:bg-muted/50 dark:hover:bg-muted/30"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const isSelectColumn = cell.column.id === "select"
                          const isActionsColumn = cell.column.id === "actions"
                          return (
                            <td 
                              key={cell.id} 
                              className={cn(
                                "px-3 py-2 text-foreground",
                                isSelectColumn && "w-[50px]",
                                isActionsColumn && "w-[80px]",
                                !isSelectColumn && !isActionsColumn && "max-w-[300px]"
                              )}
                            >
                              <div className={cn(
                                !isSelectColumn && !isActionsColumn && "truncate"
                              )}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )

                    if (enableRowContextMenu && rowActions.length > 0) {
                      return (
                        <ContextMenu key={row.id}>
                          <ContextMenuTrigger asChild>
                            {rowContent}
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            {renderContextMenuItems(row.original)}
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    }

                    return rowContent
                  })}
                  {/* Bottom padding row */}
                  {paddingBottom > 0 && (
                    <tr>
                      <td colSpan={headerGroups[0]?.headers.length || 1} style={{ height: paddingBottom, padding: 0, border: 'none' }} />
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td
                    colSpan={headerGroups[0]?.headers.length || 1}
                    className="h-24 text-center px-3 py-2"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {enablePagination && table.getPageCount() > 0 && (
        <TablePagination
          pageIndex={table.getState().pagination.pageIndex}
          pageSize={table.getState().pagination.pageSize}
          pageCount={table.getPageCount()}
          totalRows={table.getFilteredRowModel().rows.length}
          pageSizeOptions={pageSizeOptions}
          onPageChange={(pageIndex) => table.setPageIndex(pageIndex)}
          onPageSizeChange={(pageSize) => {
            table.setPageSize(pageSize)
            table.setPageIndex(0)
          }}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
        />
      )}
    </div>
  )
}
