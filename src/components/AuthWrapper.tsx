"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "./DashboardLayout";

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");
  const [isChecking, setIsChecking] = useState(!isAuthPage);

  useEffect(() => {
    // Skip check for auth pages
    if (isAuthPage) {
      return;
    }

    // Client-side check as backup (middleware should handle this, but just in case)
    const checkAuth = async () => {
      try {
        // Add timeout to prevent infinite loading if the API is slow/unreachable
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch("/api/auth/user", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Not authenticated, redirect to login
          router.push(`/login?redirect=${encodeURIComponent(pathname || "/")}`);
          return;
        }

        setIsChecking(false);
      } catch (error) {
        console.error("Auth check error:", error);
        // Always stop loading spinner - either redirect to login or show page
        setIsChecking(false);
        router.push(`/login?redirect=${encodeURIComponent(pathname || "/")}`);
      }
    };

    checkAuth();
  }, [pathname, router, isAuthPage]);

  // Show loading while checking
  if (isChecking && !isAuthPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

