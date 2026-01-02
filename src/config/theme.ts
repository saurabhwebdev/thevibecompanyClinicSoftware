/**
 * Theme Configuration
 *
 * This file contains the configurable color scheme for the clinic management system.
 * Colors can be customized per tenant or globally.
 *
 * Color Palette:
 * - Background Light: #EFF2EF (soft mint white)
 * - Primary (Medical Blue): #4D9DE0 (trust, professionalism)
 * - Destructive (Alert Red): #E15554 (warnings, critical)
 * - Dark Text: #232C33 (professional dark)
 * - Success (Health Green): #17B890 (positive, health)
 */

export interface ThemeColors {
  // Brand colors
  primary: string;
  primaryForeground: string;

  // Status colors
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  destructive: string;
  destructiveForeground: string;
  info: string;
  infoForeground: string;

  // UI colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
}

export interface ThemeConfig {
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

// Default Clinic Theme
export const defaultTheme: ThemeConfig = {
  name: "Clinic Default",
  light: {
    // Brand
    primary: "#4D9DE0",        // Medical Blue
    primaryForeground: "#FFFFFF",

    // Status
    success: "#17B890",        // Health Green
    successForeground: "#FFFFFF",
    warning: "#F59E0B",        // Amber
    warningForeground: "#FFFFFF",
    destructive: "#E15554",    // Alert Red
    destructiveForeground: "#FFFFFF",
    info: "#4D9DE0",
    infoForeground: "#FFFFFF",

    // UI
    background: "#EFF2EF",     // Soft mint white
    foreground: "#232C33",     // Professional dark
    card: "#FFFFFF",
    cardForeground: "#232C33",
    muted: "#E4E9E4",
    mutedForeground: "#5A6570",
    accent: "#E8F4FC",
    accentForeground: "#2A7AB8",
    border: "#D1D9D1",
  },
  dark: {
    // Brand
    primary: "#5AABF0",
    primaryForeground: "#1A2027",

    // Status
    success: "#2DD4A7",
    successForeground: "#1A2027",
    warning: "#FBBF24",
    warningForeground: "#1A2027",
    destructive: "#EF6B6A",
    destructiveForeground: "#1A2027",
    info: "#5AABF0",
    infoForeground: "#1A2027",

    // UI
    background: "#1A2027",
    foreground: "#F0F4F0",
    card: "#232C33",
    cardForeground: "#F0F4F0",
    muted: "#2D3842",
    mutedForeground: "#9CA8B3",
    accent: "#1E3A4D",
    accentForeground: "#5AABF0",
    border: "rgba(255, 255, 255, 0.1)",
  },
};

// Alternative themes that can be selected
export const availableThemes: Record<string, ThemeConfig> = {
  default: defaultTheme,

  professional: {
    name: "Professional",
    light: {
      ...defaultTheme.light,
      primary: "#2563EB",        // Strong Blue
      accent: "#EFF6FF",
    },
    dark: {
      ...defaultTheme.dark,
      primary: "#3B82F6",
    },
  },

  warm: {
    name: "Warm Care",
    light: {
      ...defaultTheme.light,
      primary: "#EA580C",        // Warm Orange
      success: "#22C55E",
      accent: "#FFF7ED",
    },
    dark: {
      ...defaultTheme.dark,
      primary: "#F97316",
    },
  },

  calm: {
    name: "Calm",
    light: {
      ...defaultTheme.light,
      primary: "#0D9488",        // Teal
      success: "#10B981",
      accent: "#F0FDFA",
    },
    dark: {
      ...defaultTheme.dark,
      primary: "#14B8A6",
    },
  },
};

/**
 * Convert a theme config to CSS custom properties
 */
export function themeToCssVars(theme: ThemeColors): Record<string, string> {
  return {
    "--primary": theme.primary,
    "--primary-foreground": theme.primaryForeground,
    "--success": theme.success,
    "--success-foreground": theme.successForeground,
    "--warning": theme.warning,
    "--warning-foreground": theme.warningForeground,
    "--destructive": theme.destructive,
    "--destructive-foreground": theme.destructiveForeground,
    "--info": theme.info,
    "--info-foreground": theme.infoForeground,
    "--background": theme.background,
    "--foreground": theme.foreground,
    "--card": theme.card,
    "--card-foreground": theme.cardForeground,
    "--muted": theme.muted,
    "--muted-foreground": theme.mutedForeground,
    "--accent": theme.accent,
    "--accent-foreground": theme.accentForeground,
    "--border": theme.border,
  };
}
