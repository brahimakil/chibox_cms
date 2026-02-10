"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Image,
  Ticket,
  Zap,
  Users,
  ShieldCheck,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetClose } from "@/components/ui/sheet";

const navigation = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
      { title: "Products", href: "/dashboard/products", icon: Package },
      { title: "Categories", href: "/dashboard/categories", icon: FolderTree },
    ],
  },
  {
    title: "Marketing",
    items: [
      { title: "Banners", href: "/dashboard/banners", icon: Image },
      { title: "Coupons", href: "/dashboard/coupons", icon: Ticket },
      { title: "Flash Sales", href: "/dashboard/flash-sales", icon: Zap },
    ],
  },
  {
    title: "People",
    items: [
      { title: "Customers", href: "/dashboard/customers", icon: Users },
      { title: "CMS Users", href: "/dashboard/cms-users", icon: ShieldCheck },
    ],
  },
  {
    title: "Communication",
    items: [
      { title: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function MobileSidebar() {
  const pathname = usePathname();

  return (
    <ScrollArea className="h-[calc(100vh-5rem)]">
      <nav className="flex flex-col gap-1 p-3">
        {navigation.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive
                            ? "text-sidebar-primary"
                            : "text-muted-foreground"
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span>{item.title}</span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                      )}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
