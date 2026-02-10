import { ShieldCheck, Plus } from "lucide-react";

export default function CmsUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">CMS Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage admin users and access permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Invite User
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex h-[500px] flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-full bg-muted p-4">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Manage CMS access</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add team members and assign roles to manage different parts of the admin panel. Control who can access what.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
