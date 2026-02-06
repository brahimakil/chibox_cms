import { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table"

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  enableRowSelection?: boolean
  enableGlobalFilter?: boolean
  enableColumnFilters?: boolean
  enableSorting?: boolean
  enablePagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  onRowClick?: (row: TData) => void
  onSelectionChange?: (selectedRows: TData[]) => void
  emptyMessage?: string
  loading?: boolean
  filterConfig?: FilterConfig[]
  toolbarActions?: React.ReactNode
  className?: string
  showAddButton?: boolean
  onAdd?: () => void
  addButtonLabel?: string
  rowActions?: RowAction<TData>[]
  enableRowContextMenu?: boolean
  bulkActions?: BulkAction<TData>[]
  tableHeight?: string
  title?: string
  description?: string
  // Custom handlers for server-side filtering
  onSearchChange?: (value: string) => void
  searchValue?: string
  onFilterChange?: (filterId: string, value: string) => void
  filterValues?: Record<string, string>
  // Server-side column filtering
  onColumnFilterChange?: (columnId: string, value: string) => void
  columnFilterValues?: Record<string, string>
  // Server-side sorting
  onSortingChange?: (sorting: SortingState) => void
  sortingValues?: SortingState
}

export interface FilterConfig {
  id: string
  label: string
  type: "select" | "date" | "text"
  options?: { label: string; value: string }[]
  placeholder?: string
}

export interface RowAction<TData> {
  label: string
  icon?: React.ReactNode
  onClick: (row: TData) => void
  variant?: "default" | "destructive"
  disabled?: (row: TData) => boolean
}

export interface BulkAction<TData> {
  label: string
  icon?: React.ReactNode
  onClick: (selectedRows: TData[]) => void
  variant?: "default" | "destructive" | "outline" | "secondary"
  disabled?: (selectedRows: TData[]) => boolean
}

export interface TableState {
  sorting: SortingState
  columnFilters: ColumnFiltersState
  columnVisibility: VisibilityState
  rowSelection: Record<string, boolean>
  globalFilter: string
  pagination: {
    pageIndex: number
    pageSize: number
  }
}

