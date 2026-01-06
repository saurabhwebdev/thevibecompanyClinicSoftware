"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut, User, Settings, Menu } from "lucide-react";

interface DashboardHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarStyle?: string;
    avatarSeed?: string;
    role?: {
      name: string;
    };
    tenant?: {
      name: string;
    };
  };
  onMenuClick?: () => void;
}

export function DashboardHeader({ user, onMenuClick }: DashboardHeaderProps) {
  const initials = (user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarStyle = user?.avatarStyle || "adventurer";
  const avatarSeed = user?.avatarSeed || user?.email || "user";
  const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=4D9DE0,17B890,E15554,F59E0B`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center">
          {/* Menu toggle - aligned with sidebar */}
          <div className="hidden lg:flex items-center justify-center w-16 h-16 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-10 w-10"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="text-xl font-bold text-primary px-4 lg:px-0">
            {user?.tenant?.name || "Clinic"}
          </h1>
        </div>

        <div className="flex items-center gap-2 px-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage key={`header-${avatarStyle}-${avatarSeed}`} src={avatarUrl} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || ""}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {user?.role?.name || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
