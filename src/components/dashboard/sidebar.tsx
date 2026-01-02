"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
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
          "hidden lg:flex lg:flex-col lg:border-r bg-card min-h-[calc(100vh-4rem)] relative transition-all duration-300 ease-in-out",
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
