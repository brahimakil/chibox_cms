'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ColumnDef, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/Table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { UsersForm } from "./components/UsersForm"

// User data type
interface UserData {
  userId: number;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  userRole: number;
  countryCode: string;
  phoneNumberOne: string | null;
  gender: string | null;
  hasRelatedStore: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLogin: Date | string | null;
  [key: string]: unknown;
}

// Column definitions
const columns: ColumnDef<UserData>[] = [
  {
    accessorKey: "userId",
    header: "ID",
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div className="font-medium w-16">{row.getValue("userId")}</div>
      )
    },
  },
  {
    accessorKey: "userName",
    header: "Username",
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.getValue("userName")}</div>
      )
    },
  },
  {
    accessorKey: "firstName",
    header: "First Name",
    enableSorting: true,
    cell: ({ row }) => {
      const firstName = row.getValue("firstName") as string | null
      return (
        <div className="text-sm">{firstName || '—'}</div>
      )
    },
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
    enableSorting: true,
    cell: ({ row }) => {
      const lastName = row.getValue("lastName") as string | null
      return (
        <div className="text-sm">{lastName || '—'}</div>
      )
    },
  },
  {
    accessorKey: "emailAddress",
    header: "Email",
    enableSorting: true,
    cell: ({ row }) => {
      const email = row.getValue("emailAddress") as string | null
      return (
        <div className="text-sm">{email || '—'}</div>
      )
    },
  },
  {
    accessorKey: "userRole",
    header: "Role",
    enableSorting: true,
    cell: ({ row }) => {
      const role = row.getValue("userRole") as number
      return (
        <Badge variant="outline">
          {role === 1 ? 'Admin' : role === 2 ? 'Manager' : 'User'}
        </Badge>
      )
    },
  },
  {
    accessorKey: "countryCode",
    header: "Country",
    enableSorting: true,
    cell: ({ row }) => {
      const countryCode = row.getValue("countryCode") as string
      return (
        <div className="text-sm">{countryCode}</div>
      )
    },
  },
  {
    accessorKey: "hasRelatedStore",
    header: "Has Store",
    enableSorting: true,
    cell: ({ row }) => {
      const hasStore = row.getValue("hasRelatedStore") as number
      return (
        <Badge variant={hasStore === 1 ? "default" : "secondary"} className="w-fit">
          {hasStore === 1 ? "Yes" : "No"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Last Login",
    enableSorting: true,
    cell: ({ row }) => {
      const lastLogin = row.getValue("lastLogin") as Date | string | null
      if (!lastLogin) return <div className="text-muted-foreground">—</div>
      const date = new Date(lastLogin)
      return (
        <div className="text-sm">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </div>
      )
    },
  },
]

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // View dialog state (for future use)
  // const [viewDialogOpen, setViewDialogOpen] = useState(false)
  // const [viewingUserId, setViewingUserId] = useState<number | null>(null)
  
  // User form dialog state
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<UserData | null>(null)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [usersToDelete, setUsersToDelete] = useState<UserData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Server-side pagination and filtering
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSizeOptions = [50, 100, 200, 500]

  // Filter state
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({})

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Debounce column filters (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters)
    }, 500)

    return () => clearTimeout(timer)
  }, [columnFilters])

  // Fetch users with server-side pagination and filtering
  const fetchUsers = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })

      // Add column filters
      const columnFilterMap: Record<string, string> = {
        'userId': 'id',
        'userName': 'user_name',
        'firstName': 'first_name',
        'lastName': 'last_name',
        'emailAddress': 'email_address',
        'userRole': 'user_role',
        'countryCode': 'country_code',
        'hasRelatedStore': 'has_related_store',
      }
      
      Object.entries(debouncedColumnFilters).forEach(([columnId, value]) => {
        if (value && value.trim()) {
          const apiParam = columnFilterMap[columnId] || columnId.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append(apiParam, value.trim())
        }
      })

      // Add sorting parameters
      if (sorting.length > 0) {
        const columnSortMap: Record<string, string> = {
          'userId': 'userId',
          'userName': 'userName',
          'firstName': 'firstName',
          'lastName': 'lastName',
          'emailAddress': 'emailAddress',
          'userRole': 'userRole',
          'countryCode': 'countryCode',
          'hasRelatedStore': 'hasRelatedStore',
          'lastLogin': 'lastLogin',
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/users?${params.toString()}`
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Users Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Map snake_case API response to camelCase frontend format
        interface ApiUser {
          user_id: number;
          user_name: string;
          first_name: string | null;
          last_name: string | null;
          email_address: string | null;
          user_role: number;
          country_code: string;
          phone_number_one: string | null;
          gender: string | null;
          has_related_store: number;
          created_at: string | Date;
          updated_at: string | Date;
          last_login: string | Date | null;
        }
        
        const mappedUsers: UserData[] = (data.users || []).map((user: ApiUser) => ({
          userId: user.user_id,
          userName: user.user_name,
          firstName: user.first_name,
          lastName: user.last_name,
          emailAddress: user.email_address,
          userRole: user.user_role,
          countryCode: user.country_code,
          phoneNumberOne: user.phone_number_one,
          gender: user.gender,
          hasRelatedStore: user.has_related_store,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login,
        }))
        
        setUsers(mappedUsers)
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
      } else {
        console.error('[Users Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch users",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Users Page] Error fetching users:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchUsers(currentPage)
  }, [currentPage, fetchUsers])

  // Reset to page 1 when pageSize, column filters, or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize, debouncedColumnFilters, sorting])

  // Handle column filter change
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => {
      if (value && value.trim()) {
        return { ...prev, [columnId]: value }
      } else {
        const newFilters = { ...prev }
        delete newFilters[columnId]
        return newFilters
      }
    })
  }

  // Track last click time for double-click detection
  const lastClickTime = useRef<number>(0)
  const lastClickUser = useRef<UserData | null>(null)

  const handleRowClick = (user: UserData) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime.current
    
    if (
      timeSinceLastClick < 300 &&
      lastClickUser.current?.userId === user.userId
    ) {
      // TODO: Implement view dialog
      // setViewingUserId(user.userId)
      // setViewDialogOpen(true)
      lastClickTime.current = 0
      lastClickUser.current = null
    } else {
      lastClickTime.current = now
      lastClickUser.current = user
    }
  }

  const handleSelectionChange = (selectedUsers: UserData[]) => {
    console.log("Selected users:", selectedUsers)
  }

  // Define row actions
  const rowActions = [
    // {
    //   label: "View",
    //   icon: <Eye className="h-4 w-4" />,
    //   onClick: () => {
    //     // TODO: Implement view dialog
    //     // setViewingUserId(user.userId)
    //     // setViewDialogOpen(true)
    //     toast({
    //       title: "Coming Soon",
    //       description: "View functionality will be available soon",
    //     })
    //   },
    // },
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (user: UserData) => {
        setUserToEdit(user)
        setUserFormOpen(true)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (user: UserData) => {
        setUserToDelete(user)
        setIsBulkDelete(false)
        setDeleteDialogOpen(true)
      },
      variant: "destructive" as const,
    },
  ]


  // Define bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selectedUsers: UserData[]) => {
        setUsersToDelete(selectedUsers)
        setUserToDelete(null)
        setIsBulkDelete(true)
        setDeleteDialogOpen(true)
      },
      variant: "destructive" as const,
    },
  ]

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      if (isBulkDelete && usersToDelete.length > 0) {
        // Bulk delete
        const ids = usersToDelete.map(user => user.userId)
        const response = await fetch('/api/users/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids }),
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: `${usersToDelete.length} user(s) deleted successfully`,
          })
          fetchUsers(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete users",
            variant: "destructive",
          })
        }
      } else if (userToDelete) {
        // Single delete
        const response = await fetch(`/api/users/${userToDelete.userId}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "User deleted successfully",
          })
          fetchUsers(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete user",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting user(s):', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user(s)",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      setUsersToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="bg-background p-4 space-y-4">
      <DataTable
        columns={columns}
        data={users}
        searchKey="userName"
        searchPlaceholder="Search users by username..."
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        pageSize={pageSize}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Users"
        showAddButton={true}
        onAdd={() => {
          setUserToEdit(null)
          setUserFormOpen(true)
        }}
        addButtonLabel="Add User"
        rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No users found."
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
                fetchUsers(1)
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
                  fetchUsers(newPage)
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
                  fetchUsers(newPage)
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
                fetchUsers(totalPages)
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Dialog - TODO: Implement ViewUser component */}
      {/* {viewDialogOpen && viewingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">User Details</h2>
            <p className="text-muted-foreground">User ID: {viewingUserId}</p>
            <Button
              variant="outline"
              onClick={() => {
                setViewDialogOpen(false)
                setViewingUserId(null)
              }}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )} */}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        variant={isBulkDelete ? 'bulk' : 'single'}
        itemName={userToDelete?.userName}
        itemCount={usersToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${usersToDelete.length} users?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />

      {/* User Form Dialog */}
      <UsersForm
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        userId={userToEdit?.userId || null}
        onSuccess={() => {
          fetchUsers(currentPage)
          setUserToEdit(null)
        }}
      />
    </div>
  )
}
