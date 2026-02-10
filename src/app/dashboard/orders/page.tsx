import { ShoppingCart, Download, Filter } from "lucide-react";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Orders</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track all customer orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex h-[500px] flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">No orders yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Orders will appear here once customers start placing them. Connect your backend to see real data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
