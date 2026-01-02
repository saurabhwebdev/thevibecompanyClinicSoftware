"use client";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";
import { ColorThemeProvider } from "@/components/color-theme-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <ColorThemeProvider>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  );
}
