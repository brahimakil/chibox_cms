"use client";

import { cn } from "@/lib/utils";

interface ProductStatusBadgeProps {
  source: string | null;
  className?: string;
}

export function ProductStatusBadge({
  source,
  className,
}: ProductStatusBadgeProps) {
  const is1688 = source === "1688";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        is1688
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        className
      )}
    >
      {is1688 ? "1688" : source || "Manual"}
    </span>
  );
}

interface StockBadgeProps {
  outOfStock: number;
  className?: string;
}

export function StockBadge({ outOfStock, className }: StockBadgeProps) {
  const inStock = outOfStock === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        inStock
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        className
      )}
    >
      {inStock ? "In Stock" : "Out of Stock"}
    </span>
  );
}
