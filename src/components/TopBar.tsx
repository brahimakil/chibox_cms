"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { menuItems } from "@/config/navigation";

export default function TopBar() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ [key: string]: { top: number; left: number } }>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const dropdownElement = dropdownRefs.current[openDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  const toggleDropdown = (itemName: string) => {
    if (openDropdown === itemName) {
      setOpenDropdown(null);
    } else {
      const button = buttonRefs.current[itemName];
      if (button) {
        const rect = button.getBoundingClientRect();
        setDropdownPosition({
          ...dropdownPosition,
          [itemName]: {
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
          },
        });
      }
      setOpenDropdown(itemName);
    }
  };

  return (
    <nav className="border-b border-border bg-card relative">
      <div className="flex items-center gap-1 px-6 overflow-x-auto">
        {menuItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isDropdownOpen = openDropdown === item.name;
          const isChildActive = hasChildren
            ? item.children?.some((child) => child.href && pathname === child.href)
            : false;
          const isActive = pathname === item.href || isChildActive;
          const Icon = item.icon;

          if (hasChildren) {
            const position = dropdownPosition[item.name];
            return (
              <div key={item.name} className="relative">
                <button
                  ref={(el) => {
                    buttonRefs.current[item.name] = el;
                  }}
                  onClick={() => toggleDropdown(item.name)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-foreground/80 hover:text-foreground hover:border-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isDropdownOpen && position && (
                  <div 
                    ref={(el) => {
                      dropdownRefs.current[item.name] = el;
                    }}
                    className="fixed bg-card border border-border rounded-md shadow-lg min-w-[200px]"
                    style={{ 
                      top: `${position.top}px`,
                      left: `${position.left}px`,
                      zIndex: 1000,
                    }}
                  >
                    {item.children
                      ?.filter((child) => child.href)
                      .map((child) => {
                        const isChildActive = pathname === child.href;
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.href}
                            href={child.href!}
                            onClick={() => setOpenDropdown(null)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                              isChildActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/80"
                            }`}
                          >
                            <ChildIcon className="h-4 w-4" />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          } else if (item.href) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-foreground/80 hover:text-foreground hover:border-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          }
          return null;
        })}
      </div>
    </nav>
  );
}
