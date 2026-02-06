import {
  LayoutDashboard,
  Home,
  Users,
  Package,
  Grid3x3,
  Bell,
  ShoppingCart,
  RefreshCw,
  Layers,
  Zap,
  LayoutGrid,
  MessageSquare,
  Image,
} from "lucide-react";

export interface MenuItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Home screen",
    icon: Home,
    children: [
      {
        name: "Product Sections",
        href: "/product-sections",
        icon: Layers,
      },
      {
        name: "Flash Sales",
        href: "/flash-sales",
        icon: Zap,
      },
      {
        name: "Grids",
        href: "/grids",
        icon: LayoutGrid,
      },
      {
        name: "Splash Ads",
        href: "/splash-ads",
        icon: Image,
      },
    ],
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
  },
    {
      name: "Products",
      href: "/products",
      icon: Package,
    },
    {
      name: "Product Reviews",
      href: "/product-reviews",
      icon: MessageSquare,
    },
  {
    name: "Categories",
    href: "/categories",
    icon: Grid3x3,
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    name: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    name: "Sync",
    href: "/sync",
    icon: RefreshCw,
  },
];
