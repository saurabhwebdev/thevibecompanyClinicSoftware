"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserRound,
  CalendarDays,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  ShoppingCart,
  Receipt,
  BarChart3,
  Mail,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: UserRound },
  { name: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
  { name: "Billing (POS)", href: "/dashboard/billing", icon: ShoppingCart },
  { name: "Invoices", href: "/dashboard/invoices", icon: Receipt },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Communications", href: "/dashboard/communications", icon: Mail },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Roles", href: "/dashboard/roles", icon: Shield },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface DashboardSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function DashboardSidebar({ isCollapsed, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:border-r bg-card relative transition-all duration-300 ease-in-out flex-shrink-0",
          isCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-center rounded-lg h-10 w-10 mx-auto transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-4">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle Button */}
        <div className="px-3 py-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2",
              isCollapsed ? "h-10 w-10 mx-auto justify-center" : "w-full justify-start px-3"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// Mobile Sidebar Drawer
interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left text-primary">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
