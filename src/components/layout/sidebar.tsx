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
  MonitorPlay,
  Users,
  ShieldCheck,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Orders",
        href: "/dashboard/orders",
        icon: ShoppingCart,
      },
      {
        title: "Products",
        href: "/dashboard/products",
        icon: Package,
      },
      {
        title: "Categories",
        href: "/dashboard/categories",
        icon: FolderTree,
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        title: "Banners",
        href: "/dashboard/banners",
        icon: Image,
      },
      {
        title: "Splash Ads",
        href: "/dashboard/splash-ads",
        icon: MonitorPlay,
      },
      {
        title: "Coupons",
        href: "/dashboard/coupons",
        icon: Ticket,
      },
      {
        title: "Flash Sales",
        href: "/dashboard/flash-sales",
        icon: Zap,
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        title: "Customers",
        href: "/dashboard/customers",
        icon: Users,
      },
      {
        title: "CMS Users",
        href: "/dashboard/cms-users",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                  ChiHelo
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Admin Panel
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="flex flex-col gap-1 p-3">
            {navigation.map((group) => (
              <div key={group.title} className="mb-2">
                {!collapsed && (
                  <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </p>
                )}
                {collapsed && (
                  <div className="mx-auto my-1 h-px w-6 bg-sidebar-border" />
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));

                    const linkContent = (
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            isActive
                              ? "text-sidebar-primary"
                              : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                          )}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        {!collapsed && <span>{item.title}</span>}
                        {isActive && !collapsed && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                        )}
                      </Link>
                    );

                    if (collapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <div key={item.href}>{linkContent}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full justify-center text-muted-foreground hover:text-foreground",
              !collapsed && "justify-end"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <span className="text-xs">Collapse</span>
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
