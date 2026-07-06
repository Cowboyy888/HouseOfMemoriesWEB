"use client";

import {
  BarChart3,
  Car,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Modules not built yet this sprint — shown so the full IA is visible,
   * but not linked, so nothing points at a page that doesn't exist. */
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Executive Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Fleet Management", href: "/fleet", icon: Car, comingSoon: true },
  { label: "Booking Management", href: "/bookings", icon: CalendarCheck, comingSoon: true },
  { label: "Sales Management", href: "/sales", icon: ShoppingCart, comingSoon: true },
  { label: "Customer Management", href: "/customers", icon: Users, comingSoon: true },
  { label: "Employee Management", href: "/employees", icon: UserCog, comingSoon: true },
  { label: "Finance", href: "/finance", icon: Wallet, comingSoon: true },
  { label: "Reports & Analytics", href: "/reports", icon: BarChart3, comingSoon: true },
  { label: "CMS", href: "/cms", icon: FileText, comingSoon: true },
  { label: "Settings", href: "/settings", icon: Settings, comingSoon: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            D
          </div>
          <span className="font-heading text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            DriveHub Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {item.comingSoon ? (
                    <SidebarMenuButton disabled tooltip={`${item.label} — coming soon`}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
