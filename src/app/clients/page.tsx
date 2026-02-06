'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ColumnDef, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/Table"
import { Mail, Phone, Trash2, Download, Archive, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { DisableConfirmDialog } from "@/components/DisableConfirmDialog"

// Client data type
interface Client {
  id: number
  firstName: string
  lastName: string
  email: string | null
  countryCode: string | null
  phoneNumber: string | null
  gender: string | null
  isActive: number
  createdAt: string | Date
}

// Column definitions
const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "id",
    header: "ID",
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div className="font-medium w-16">{row.getValue("id")}</div>
      )
    },
  },
  {
    accessorKey: "firstName",
    header: "First Name",
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.getValue("firstName")}</div>
      )
    },
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.getValue("lastName")}</div>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    enableSorting: true,
    cell: ({ row }) => {
      const email = row.getValue("email") as string | null
      if (!email) return <div className="text-muted-foreground">-</div>
      return (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a 
            href={`mailto:${email}`}
            className="text-primary hover:underline"
          >
            {email}
          </a>
        </div>
      )
    },
  },
  {
    accessorKey: "countryCode",
    header: "Country Code",
    enableSorting: true,
    cell: ({ row }) => {
      const countryCode = row.getValue("countryCode") as string | null
      return (
        <div className="text-sm">{countryCode || '-'}</div>
      )
    },
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone Number",
    enableSorting: true,
    cell: ({ row }) => {
      const phoneNumber = row.getValue("phoneNumber") as string | null
      return (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{phoneNumber || '-'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "gender",
    header: "Gender",
    enableSorting: true,
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string | null
      return (
        <div className="text-sm">{gender || '-'}</div>
      )
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as number
      return (
        <div className="flex items-center gap-2">
          {isActive === 1 ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-green-700 dark:text-green-400">Active</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-sm text-red-700 dark:text-red-400">Disabled</span>
            </>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | string | null
      if (!date) return <div className="text-sm">—</div>
      const formattedDate = new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      return (
        <div className="text-sm">{formattedDate}</div>
      )
    },
  },
]

export default function Customers() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const pageSizeOptions = [50, 100, 200, 500]

  // Filter state - all filters handled on backend
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({})

  // Sorting state - all sorting handled on backend
  const [sorting, setSorting] = useState<SortingState>([])

  // Disable dialog state
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [clientToDisable, setClientToDisable] = useState<Client | null>(null)
  const [isDisabling, setIsDisabling] = useState(false)

  const { toast } = useToast()

  // Debounce column filters (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters)
    }, 500)

    return () => clearTimeout(timer)
  }, [columnFilters])

  const fetchClients = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })

      // Add column filters (from header filters)
      // Map column IDs (camelCase) to API parameter names (snake_case)
      const columnFilterMap: Record<string, string> = {
        'id': 'id',
        'firstName': 'first_name',
        'lastName': 'last_name',
        'email': 'email',
        'countryCode': 'country_code',
        'phoneNumber': 'phone_number',
        'gender': 'gender',
        'isActive': 'is_active',
        'createdAt': 'created_at',
      }
      
      Object.entries(debouncedColumnFilters).forEach(([columnId, value]) => {
        if (value && value.trim()) {
          // Use mapping if available, otherwise convert camelCase to snake_case
          const apiParam = columnFilterMap[columnId] || columnId.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append(apiParam, value.trim())
        }
      })

      // Add sorting parameters
      if (sorting.length > 0) {
        // Map column IDs (camelCase) to API parameter names (snake_case)
        const columnSortMap: Record<string, string> = {
          'id': 'id',
          'firstName': 'first_name',
          'lastName': 'last_name',
          'email': 'email',
          'countryCode': 'country_code',
          'phoneNumber': 'phone_number',
          'gender': 'gender',
          'isActive': 'is_active',
          'createdAt': 'created_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }

      const response = await fetch(`/api/clients?${params.toString()}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Clients Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()

      if (data.success) {
        // UsersModel.findAll already returns camelCase format
        setClients(data.users || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch clients",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchClients(currentPage)
  }, [currentPage, fetchClients])

  // Reset to page 1 when pageSize, column filters, or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize, debouncedColumnFilters, sorting])

  // Handle column filter change (from header filters)
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => {
      // Check if trimmed value is empty to decide whether to keep or remove filter
      // But store the original value (with spaces) to allow multi-word searches
      if (value && value.trim()) {
        return { ...prev, [columnId]: value }
      } else {
        const newFilters = { ...prev }
        delete newFilters[columnId]
        return newFilters
      }
    })
  }

  const handleRowClick = (client: Client) => {
    console.log("Client clicked:", client)
    // You can navigate to client details page here
    // router.push(`/clients/${client.id}`)
  }

  const handleSelectionChange = (selectedClients: Client[]) => {
    console.log("Selected clients:", selectedClients)
    // Handle bulk actions here
  }

  // Handle disable client
  const handleDisableClient = async () => {
    if (!clientToDisable) return

    try {
      setIsDisabling(true)
      const response = await fetch(`/api/clients/${clientToDisable.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: 0,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to disable client')
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: `Client "${clientToDisable.firstName} ${clientToDisable.lastName}" has been disabled.`,
        })
        // Refresh the clients list
        fetchClients(currentPage)
      } else {
        throw new Error(data.error || 'Failed to disable client')
      }
    } catch (error) {
      console.error('Error disabling client:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disable client",
        variant: "destructive",
      })
    } finally {
      setIsDisabling(false)
      setClientToDisable(null)
    }
  }

  // Define row actions
  // const rowActions = [
    // {
    //   label: "Disable Client",
    //   icon: <Ban className="h-4 w-4" />,
    //   onClick: (client: Client) => {
    //     setClientToDisable(client)
    //     setDisableDialogOpen(true)
    //   },
    //   variant: "default" as const,
    // },
    // {
    //   label: "View",
    //   icon: <Eye className="h-4 w-4" />,
    //   onClick: (client: Client) => {
    //     console.log("View client:", client)
    //     // router.push(`/clients/${client.id}`)
    //   },
    // },
    // {
    //   label: "Edit",
    //   icon: <Pencil className="h-4 w-4" />,
    //   onClick: (client: Client) => {
    //     console.log("Edit client:", client)
    //     // router.push(`/clients/${client.id}/edit`)
    //   },
    // },
    // {
    //   label: "Delete",
    //   icon: <Trash2 className="h-4 w-4" />,
    //   onClick: (client: Client) => {
    //     console.log("Delete client:", client)
    //     // Add delete confirmation dialog here
    //     // if (confirm(`Are you sure you want to delete ${client.name}?`)) {
    //     //   // Delete logic
    //     // }
    //   },
    //   variant: "destructive" as const,
    // },
  // ]

  // Define bulk actions
  const bulkActions = [
    {
      label: "Export Selected",
      icon: <Download className="h-4 w-4" />,
      onClick: (selectedClients: Client[]) => {
        console.log("Export clients:", selectedClients)
        // Add export logic here
      },
      variant: "outline" as const,
    },
    {
      label: "Archive Selected",
      icon: <Archive className="h-4 w-4" />,
      onClick: (selectedClients: Client[]) => {
        console.log("Archive clients:", selectedClients)
        // Add archive logic here
      },
      variant: "secondary" as const,
    },
    {
      label: "Delete Selected",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selectedClients: Client[]) => {
        console.log("Delete clients:", selectedClients)
        // Add delete confirmation dialog here
        // if (confirm(`Are you sure you want to delete ${selectedClients.length} clients?`)) {
        //   // Delete logic
        // }
      },
      variant: "destructive" as const,
    },
  ]

  return (
    <div className="bg-background p-4 space-y-4">
      <DisableConfirmDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        onConfirm={handleDisableClient}
        itemName={clientToDisable ? `${clientToDisable.firstName} ${clientToDisable.lastName}` : ''}
        isLoading={isDisabling}
        variant="single"
      />
      <DataTable
        columns={columns}
        data={clients}
        searchKey="name"
        searchPlaceholder="Search clients by name..."
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Clients"
        showAddButton={false}
        onAdd={() => {
          console.log("Add new client clicked")
          // Add your navigation or modal logic here
          // router.push("/clients/new")
        }}
        addButtonLabel="Add Client"
        // rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No clients found."
        onColumnFilterChange={handleColumnFilterChange}
        columnFilterValues={columnFilters}
        onSortingChange={setSorting}
        sortingValues={sorting}
      />
      
      {/* Server-side pagination controls */}
      {(totalPages > 1 || total > 0) && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number.parseInt(value))}
              >
                <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-input/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(1)
                fetchClients(1)
              }}
              disabled={currentPage === 1 || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  const newPage = currentPage - 1
                  setCurrentPage(newPage)
                  fetchClients(newPage)
                }
              }}
              disabled={currentPage === 1 || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < totalPages) {
                  const newPage = currentPage + 1
                  setCurrentPage(newPage)
                  fetchClients(newPage)
                }
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(totalPages)
                fetchClients(totalPages)
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
};