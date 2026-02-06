"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { menuItems } from "@/config/navigation";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [manuallyExpandedItems, setManuallyExpandedItems] = useState<Set<string>>(new Set());
  const [manuallyCollapsedItems, setManuallyCollapsedItems] = useState<Set<string>>(new Set());

  // Auto-expand parent items when a child route is active
  const autoExpandedItems = useMemo(() => {
    const expanded = new Set<string>();
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.href && pathname === child.href
        );
        if (hasActiveChild) {
          expanded.add(item.name);
        }
      }
    });
    return expanded;
  }, [pathname]);

  // Merge auto-expanded and manually expanded items, but respect manually collapsed items
  const expandedItems = useMemo(() => {
    const expanded = new Set<string>();
    menuItems.forEach((item) => {
      if (item.children) {
        // If manually collapsed, don't expand
        if (manuallyCollapsedItems.has(item.name)) {
          return;
        }
        // If manually expanded, include it
        if (manuallyExpandedItems.has(item.name)) {
          expanded.add(item.name);
        }
        // If auto-expanded (child is active), include it
        if (autoExpandedItems.has(item.name)) {
          expanded.add(item.name);
        }
      }
    });
    return expanded;
  }, [autoExpandedItems, manuallyExpandedItems, manuallyCollapsedItems]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-border bg-card transition-all duration-300 ease-in-out shadow-lg ${
          isOpen ? "w-64" : "w-20"
        } ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            {isOpen && (
              <h1 className="text-xl font-bold text-foreground transition-opacity duration-200">
                Alimama CMS
              </h1>
            )}
            {!isOpen && (
              <div className="flex w-full items-center justify-center">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  A
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {menuItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.has(item.name);
              const isChildActive = hasChildren
                ? item.children?.some((child) => child.href && pathname === child.href)
                : false;
              const isActive = pathname === item.href || isChildActive;
              const Icon = item.icon;

              const toggleExpand = (e: React.MouseEvent) => {
                e.preventDefault();
                const currentlyExpanded = expandedItems.has(item.name);
                
                if (currentlyExpanded) {
                  // Collapse: add to manually collapsed, remove from manually expanded
                  setManuallyCollapsedItems((prev) => new Set(prev).add(item.name));
                  setManuallyExpandedItems((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(item.name);
                    return newSet;
                  });
                } else {
                  // Expand: remove from manually collapsed, add to manually expanded
                  setManuallyCollapsedItems((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(item.name);
                    return newSet;
                  });
                  setManuallyExpandedItems((prev) => new Set(prev).add(item.name));
                }
              };

              return (
                <div key={item.name}>
                  {hasChildren ? (
                    <button
                      onClick={toggleExpand}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      } ${!isOpen ? "justify-center" : ""}`}
                      title={!isOpen ? item.name : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {isOpen && (
                        <>
                          <span className="flex-1 text-left transition-opacity duration-200">
                            {item.name}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                        </>
                      )}
                    </button>
                  ) : (
                    item.href ? (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground"
                        } ${!isOpen ? "justify-center" : ""}`}
                        title={!isOpen ? item.name : undefined}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {isOpen && (
                          <span className="transition-opacity duration-200">
                            {item.name}
                          </span>
                        )}
                      </Link>
                    ) : null
                  )}
                  {hasChildren && isExpanded && isOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
                      {item.children
                        ?.filter((child) => child.href)
                        .map((child) => {
                          const isChildActive = pathname === child.href;
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href!}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                                isChildActive
                                  ? "bg-primary/10 text-primary shadow-sm"
                                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
