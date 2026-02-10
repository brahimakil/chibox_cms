import { Send, Plus } from "lucide-react";

export default function PushNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Push Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Send push notifications to your app users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Notification
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Sent</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Delivered</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Opened</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex h-[400px] flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-full bg-muted p-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">No push notifications sent</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Send push notifications to engage your mobile app users. Target specific segments or broadcast to all users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
