"use client";

import { useState, useEffect } from "react";
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
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetClose } from "@/components/ui/sheet";

const navigation = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "page.dashboard" },
      { title: "Orders", href: "/dashboard/orders", icon: ShoppingCart, permission: "page.orders" },
      { title: "Item List", href: "/dashboard/items", icon: ClipboardList, permission: "page.orders.item_master_list" },
      { title: "Products", href: "/dashboard/products", icon: Package, permission: "page.products" },
      { title: "Categories", href: "/dashboard/categories", icon: FolderTree, permission: "page.categories" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { title: "Banners", href: "/dashboard/banners", icon: Image, permission: "page.banners" },
      { title: "Coupons", href: "/dashboard/coupons", icon: Ticket, permission: "page.coupons" },
      { title: "Flash Sales", href: "/dashboard/flash-sales", icon: Zap, permission: "page.flash_sales" },
    ],
  },
  {
    title: "People",
    items: [
      { title: "Customers", href: "/dashboard/customers", icon: Users, permission: "page.customers" },
      { title: "CMS Users", href: "/dashboard/cms-users", icon: ShieldCheck, permission: "page.cms_users" },
    ],
  },
  {
    title: "Communication",
    items: [
      { title: "Notifications", href: "/dashboard/notifications", icon: Bell, permission: "page.notifications" },
    ],
  },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.permissions) setPermissions(d.user.permissions);
      })
      .catch(() => {});
  }, []);

  const filteredNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || permissions.includes(item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <ScrollArea className="h-[calc(100vh-5rem)]">
      <nav className="flex flex-col gap-1 p-3">
        {filteredNavigation.map((group) => (
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
