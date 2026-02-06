# DataTable Component

A professional, reusable table component built with **TanStack Table (React Table v8)** and **Radix UI** components. This table provides advanced features like sorting, filtering, pagination, row selection, and more.

## 📚 Libraries Used

### Core Library
- **[@tanstack/react-table](https://tanstack.com/table)** - Industry-standard table library for React
  - Provides powerful table state management
  - Handles sorting, filtering, pagination, and row selection
  - Highly performant and flexible

### UI Components
- **Radix UI** - Accessible, unstyled UI primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

## 🎯 Features

- ✅ **Sorting** - Click column headers to sort (ascending/descending)
- ✅ **Global Search** - Search across all data
- ✅ **Column Filters** - Filter by specific columns using dropdowns
- ✅ **Row Selection** - Select individual rows or all rows with checkboxes
- ✅ **Pagination** - Navigate through pages with customizable page sizes
- ✅ **Loading States** - Skeleton loaders while data is loading
- ✅ **Empty States** - Customizable empty state messages
- ✅ **Row Click Handlers** - Handle row clicks for navigation or actions
- ✅ **Customizable Toolbar** - Add custom action buttons
- ✅ **Fully Typed** - Complete TypeScript support
- ✅ **Responsive** - Works on all screen sizes
- ✅ **Accessible** - ARIA labels and keyboard navigation

## 📦 Installation

The component uses `@tanstack/react-table` which should already be installed. If not:

```bash
npm install @tanstack/react-table
```

## 🚀 Basic Usage

```tsx
import { DataTable } from "@/components/Table"
import { ColumnDef } from "@tanstack/react-table"

// Define your data type
interface User {
  id: string
  name: string
  email: string
  role: string
}

// Define columns
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    enableSorting: true,
  },
  {
    accessorKey: "role",
    header: "Role",
  },
]

// Your data
const data: User[] = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "Admin" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "User" },
]

// Use the component
export function MyTable() {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      enableSorting={true}
      enablePagination={true}
    />
  )
}
```

## 📖 Props Reference

### DataTableProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | **required** | Column definitions for the table |
| `data` | `TData[]` | **required** | Array of data to display |
| `searchKey` | `string` | `undefined` | Key to search in data (e.g., "name", "email") |
| `searchPlaceholder` | `string` | `"Search..."` | Placeholder text for search input |
| `enableRowSelection` | `boolean` | `false` | Enable row selection with checkboxes |
| `enableGlobalFilter` | `boolean` | `true` | Enable global search filter |
| `enableColumnFilters` | `boolean` | `true` | Enable column-specific filters |
| `enableSorting` | `boolean` | `true` | Enable column sorting |
| `enablePagination` | `boolean` | `true` | Enable pagination |
| `pageSize` | `number` | `10` | Number of rows per page |
| `pageSizeOptions` | `number[]` | `[10, 20, 30, 50, 100]` | Available page size options |
| `onRowClick` | `(row: TData) => void` | `undefined` | Callback when a row is clicked |
| `onSelectionChange` | `(selectedRows: TData[]) => void` | `undefined` | Callback when selection changes |
| `emptyMessage` | `string` | `"No results found."` | Message to show when no data |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `filterConfig` | `FilterConfig[]` | `[]` | Configuration for filter dropdowns |
| `toolbarActions` | `React.ReactNode` | `undefined` | Custom action buttons in toolbar |
| `className` | `string` | `undefined` | Additional CSS classes |

## 🔧 Column Definitions

Columns are defined using TanStack Table's `ColumnDef` type:

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",        // Data key
    header: "Name",             // Column header
    enableSorting: true,        // Enable sorting for this column
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {        // Custom cell renderer
      return <a href={`mailto:${row.getValue("email")}`}>
        {row.getValue("email")}
      </a>
    },
  },
  {
    id: "actions",              // Custom column ID
    header: "Actions",
    cell: ({ row }) => {        // Custom actions cell
      return <Button onClick={() => handleAction(row.original)}>
        Edit
      </Button>
    },
    enableSorting: false,        // Disable sorting for actions column
  },
]
```

## 🎨 Filter Configuration

Configure filters using the `filterConfig` prop:

```tsx
const filterConfig = [
  {
    id: "role",                 // Must match column accessorKey
    label: "Role",
    type: "select",
    options: [
      { label: "Admin", value: "admin" },
      { label: "User", value: "user" },
    ],
    placeholder: "Filter by role",
  },
]

<DataTable
  columns={columns}
  data={data}
  filterConfig={filterConfig}
/>
```

## 💡 Advanced Examples

### With Row Selection

```tsx
const [selectedRows, setSelectedRows] = useState<User[]>([])

<DataTable
  columns={columns}
  data={data}
  enableRowSelection={true}
  onSelectionChange={setSelectedRows}
/>

// Access selected rows
console.log(selectedRows)
```

### With Row Click Handler

```tsx
<DataTable
  columns={columns}
  data={data}
  onRowClick={(row) => {
    router.push(`/users/${row.id}`)
  }}
/>
```

### With Custom Toolbar Actions

```tsx
<DataTable
  columns={columns}
  data={data}
  toolbarActions={
    <>
      <Button onClick={handleExport}>Export</Button>
      <Button onClick={handleAdd}>Add New</Button>
    </>
  }
/>
```

### With Loading State

```tsx
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchData().then(() => setLoading(false))
}, [])

<DataTable
  columns={columns}
  data={data}
  loading={loading}
/>
```

## 🎯 How It Works

1. **State Management**: TanStack Table manages all table state (sorting, filtering, pagination, selection) internally
2. **Column Definitions**: You define columns with accessors, headers, and custom renderers
3. **Data Processing**: The library processes your data based on current filters, sorting, and pagination
4. **Rendering**: The component renders the processed data using Radix UI table components
5. **User Interactions**: User actions (click, sort, filter) update the internal state, which triggers re-renders

## 🔍 Search Functionality

The `searchKey` prop specifies which field to search in. The search is case-insensitive and matches partial strings:

```tsx
<DataTable
  searchKey="name"  // Searches in the "name" field
  data={users}
/>
```

## 📄 Pagination

Pagination is handled automatically. Users can:
- Navigate between pages
- Change page size
- See total row count and current range

## 🎨 Styling

The component uses Tailwind CSS and follows your existing design system. It automatically adapts to light/dark themes if you're using `next-themes`.

## 🐛 Troubleshooting

### Table not showing data
- Ensure `data` prop is an array
- Check that `columns` match your data structure
- Verify `accessorKey` matches data keys

### Sorting not working
- Set `enableSorting={true}` on the component
- Set `enableSorting: true` on individual columns

### Filters not working
- Ensure `filterConfig` id matches column `accessorKey`
- Check that filter values match your data values

## 📚 Resources

- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Example Usage File](./example-usage.tsx)

## 🤝 Contributing

Feel free to extend this component with additional features like:
- Column visibility toggle
- Export to CSV/Excel
- Inline editing
- Drag and drop rows
- Virtual scrolling for large datasets

