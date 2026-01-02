"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ColorTheme =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "rose"
  | "teal"
  // Pantone Colors of the Year
  | "mocha"      // 2025
  | "peach"      // 2024
  | "magenta"    // 2023
  | "veri-peri"  // 2022
  | "illuminating" // 2021
  | "classic-blue" // 2020
  | "coral"      // 2019
  | "ultra-violet" // 2018
  | "greenery"   // 2017
  | "serenity"   // 2016
  | "marsala"    // 2015
  | "orchid"     // 2014
  | "emerald"    // 2013
  | "tangerine"  // 2012
  | "honeysuckle" // 2011
  | "turquoise"  // 2010
  | "mimosa"     // 2009
  | "blue-iris"  // 2008
  | "chili"      // 2007
  | "sand"       // 2006
  | "tigerlily"; // 2005

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

const COLOR_THEME_KEY = "color-theme";

const ALL_THEMES: ColorTheme[] = [
  "blue", "green", "purple", "orange", "rose", "teal",
  "mocha", "peach", "magenta", "veri-peri", "illuminating", "classic-blue",
  "coral", "ultra-violet", "greenery", "serenity", "marsala", "orchid",
  "emerald", "tangerine", "honeysuckle", "turquoise", "mimosa", "blue-iris",
  "chili", "sand", "tigerlily"
];

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("blue");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COLOR_THEME_KEY) as ColorTheme | null;
    if (saved && ALL_THEMES.includes(saved)) {
      setColorThemeState(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Remove all theme classes
    ALL_THEMES.forEach(t => document.documentElement.classList.remove(`theme-${t}`));

    // Add current theme class
    document.documentElement.classList.add(`theme-${colorTheme}`);
  }, [colorTheme, mounted]);

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(COLOR_THEME_KEY, theme);
  };

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
}

// Color theme definitions
export const colorThemes: Record<ColorTheme, { name: string; primary: string; year?: string }> = {
  // Base themes
  blue: { name: "Medical Blue", primary: "#4D9DE0" },
  green: { name: "Health Green", primary: "#17B890" },
  purple: { name: "Calm Purple", primary: "#8B5CF6" },
  orange: { name: "Warm Orange", primary: "#F59E0B" },
  rose: { name: "Soft Rose", primary: "#E11D48" },
  teal: { name: "Ocean Teal", primary: "#0D9488" },

  // Pantone Colors of the Year
  mocha: { name: "Mocha Mousse", primary: "#A47864", year: "2025" },
  peach: { name: "Peach Fuzz", primary: "#FFBE98", year: "2024" },
  magenta: { name: "Viva Magenta", primary: "#BB2649", year: "2023" },
  "veri-peri": { name: "Very Peri", primary: "#6667AB", year: "2022" },
  illuminating: { name: "Illuminating", primary: "#F5DF4D", year: "2021" },
  "classic-blue": { name: "Classic Blue", primary: "#0F4C81", year: "2020" },
  coral: { name: "Living Coral", primary: "#FF6F61", year: "2019" },
  "ultra-violet": { name: "Ultra Violet", primary: "#5F4B8B", year: "2018" },
  greenery: { name: "Greenery", primary: "#88B04B", year: "2017" },
  serenity: { name: "Serenity", primary: "#92A8D1", year: "2016" },
  marsala: { name: "Marsala", primary: "#955251", year: "2015" },
  orchid: { name: "Radiant Orchid", primary: "#B565A7", year: "2014" },
  emerald: { name: "Emerald", primary: "#009473", year: "2013" },
  tangerine: { name: "Tangerine Tango", primary: "#DD4124", year: "2012" },
  honeysuckle: { name: "Honeysuckle", primary: "#D65076", year: "2011" },
  turquoise: { name: "Turquoise", primary: "#45B8AC", year: "2010" },
  mimosa: { name: "Mimosa", primary: "#EFC050", year: "2009" },
  "blue-iris": { name: "Blue Iris", primary: "#5B5EA6", year: "2008" },
  chili: { name: "Chili Pepper", primary: "#9B2335", year: "2007" },
  sand: { name: "Sand Dollar", primary: "#DECDBE", year: "2006" },
  tigerlily: { name: "Tiger Lily", primary: "#E2583E", year: "2005" },
};

// Helper to get themes by category
export const baseThemes: ColorTheme[] = ["blue", "green", "purple", "orange", "rose", "teal"];
export const pantoneThemes: ColorTheme[] = [
  "mocha", "peach", "magenta", "veri-peri", "illuminating", "classic-blue",
  "coral", "ultra-violet", "greenery", "serenity", "marsala", "orchid",
  "emerald", "tangerine", "honeysuckle", "turquoise", "mimosa", "blue-iris",
  "chili", "sand", "tigerlily"
];
