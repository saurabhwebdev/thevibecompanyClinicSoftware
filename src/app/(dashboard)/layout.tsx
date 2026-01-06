"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { CurrencyProvider } from "@/components/currency-provider";
import { Loader2 } from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
    setIsHydrated(true);
  }, []);

  // Fetch clinic name and update document title
  useEffect(() => {
    const fetchClinicName = async () => {
      try {
        const res = await fetch("/api/tax-config");
        const data = await res.json();

        if (data.success && data.data) {
          const clinicName = data.data.tradeName || data.data.legalName || "Clinic";
          document.title = `${clinicName} - Clinic Management System`;
        }
      } catch (error) {
        // Fallback to default title
        document.title = "Clinic Management System";
      }
    };

    if (session) {
      fetchClinicName();
    }
  }, [session]);

  const handleToggle = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  // Prevent hydration mismatch by not rendering until client-side state is loaded
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CurrencyProvider>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <DashboardHeader user={session.user} onMenuClick={handleToggle} />
        <div className="flex flex-1 overflow-hidden">
          <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggle} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
