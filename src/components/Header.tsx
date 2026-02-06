"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Moon,
  Sun,
  ChevronLeft,
  PanelLeft,
  PanelTop,
  User,
  Settings,
  LogOut,
  UserCircle,
  Bell,
  Check,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { LayoutMode } from "./DashboardLayout";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  layoutMode: LayoutMode;
  onLayoutModeChange: () => void;
}

interface AgNotification {
  id: number;
  type: number | null;
  status: number; // 0 = unread, 1 = read
  subject: string;
  description: string;
  targetId: number;
  lockedBy: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function Header({
  onMenuClick,
  isSidebarOpen,
  layoutMode,
  onLayoutModeChange,
}: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<{
    firstName: string | null;
    lastName: string | null;
    userName: string;
    emailAddress: string | null;
  } | null>(null);
  const [notifications, setNotifications] = useState<AgNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notificationLimit, setNotificationLimit] = useState(5);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Use resolvedTheme which is available after hydration
  const isDark = resolvedTheme === "dark";

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/user", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser({
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              userName: data.user.userName,
              emailAddress: data.user.emailAddress,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  // Fetch unread admin notifications
  const fetchNotifications = async (limit: number = notificationLimit, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingNotifications(true);
      }
      // Fetch unread notifications (status=0) from ag_notification table
      const response = await fetch(`/api/ag-notifications?status=0&limit=${limit}`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.total || 0);
          setHasMoreNotifications((data.notifications?.length || 0) < (data.total || 0));
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoadingNotifications(false);
      setLoadingMore(false);
    }
  };

  // Load more notifications
  const handleLoadMore = async () => {
    const newLimit = notificationLimit + 5;
    setNotificationLimit(newLimit);
    await fetchNotifications(newLimit, true);
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotificationMenuOpen(false);
        // Reset limit when menu closes
        setNotificationLimit(5);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Important: include cookies
      });

      if (response.ok) {
        // Show success toast
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      }

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "An error occurred during logout.",
        variant: "destructive",
      });
      // Redirect to login even on error
      router.push("/login");
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/ag-notifications/${notificationId}/mark-read`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // Refresh notifications
        fetchNotifications();
        toast({
          title: "Success",
          description: "Notification marked as read",
        });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/ag-notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        fetchNotifications();
        toast({
          title: "Success",
          description: "All notifications marked as read",
        });
      } else {
        throw new Error("Failed to mark all as read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        {layoutMode === "sidebar" && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-foreground/80 hover:bg-muted hover:text-foreground transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              className={`h-5 w-5 transition-transform duration-300 ${
                !isSidebarOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
        
        {/* Logo/Title - Hidden on small screens when sidebar is visible */}
        {(layoutMode === "topbar" || !isSidebarOpen) && (
          <h1 className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">
            Alimama CMS
          </h1>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onLayoutModeChange}
          className="rounded-lg p-2 text-foreground/80 hover:bg-muted hover:text-foreground transition-all duration-200"
          aria-label="Toggle layout mode"
          title={`Switch to ${layoutMode === "sidebar" ? "top bar" : "sidebar"}`}
        >
          {layoutMode === "sidebar" ? (
            <PanelTop className="h-5 w-5" />
          ) : (
            <PanelLeft className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-foreground/80 hover:bg-muted hover:text-foreground transition-all duration-200"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications Menu */}
        <div className="relative" ref={notificationMenuRef}>
          <button
            onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
            className="rounded-lg p-2 text-foreground/80 hover:bg-muted hover:text-foreground transition-all duration-200 relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-[500px] overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
              <div className="p-3 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                <p className="text-sm font-semibold text-foreground">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({unreadCount} unread)
                    </span>
                  )}
                </p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {loadingNotifications ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No unread notifications
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-3 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Message Icon */}
                          <div className="shrink-0 mt-0.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                              {notification.subject}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.description}
                            </p>
                            {notification.createdAt && (
                              <p className="text-xs text-muted-foreground/70 mt-1.5">
                                {new Date(notification.createdAt).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            )}
                          </div>
                          {/* Mark as read button */}
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1.5 hover:bg-muted"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {hasMoreNotifications && (
                <div className="p-3 border-t border-border sticky bottom-0 bg-card">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "View more"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="rounded-lg p-2 text-foreground/80 hover:bg-muted hover:text-foreground transition-all duration-200"
            aria-label="User menu"
          >
            <User className="h-5 w-5" />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  {user
                    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                      user.userName
                    : "Loading..."}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.emailAddress || user?.userName || ""}
                </p>
              </div>

              <div className="p-2">
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors">
                  <UserCircle className="h-4 w-4" />
                  <span>Profile</span>
                </button>

                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>

                <div className="my-2 h-px bg-border" />

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

