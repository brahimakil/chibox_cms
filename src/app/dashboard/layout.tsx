"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR/client Radix ID mismatch by deferring until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div
          className={cn(
            "flex min-h-screen flex-col transition-all duration-300",
            "md:ml-[260px]"
          )}
        >
          <div className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 md:px-6 md:pl-[276px]" />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          collapsed ? "md:ml-[68px]" : "md:ml-[260px]"
        )}
      >
        <Header sidebarCollapsed={collapsed} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
