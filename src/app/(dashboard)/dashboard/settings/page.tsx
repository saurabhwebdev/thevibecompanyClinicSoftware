"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Check, Palette, Receipt, CreditCard, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useColorTheme,
  colorThemes,
  baseThemes,
  pantoneThemes,
  ColorTheme,
} from "@/components/color-theme-provider";
import { TaxConfigForm } from "@/components/settings/tax-config-form";
import { PaymentSettingsForm } from "@/components/settings/payment-settings-form";
import { PublicBookingSettingsForm } from "@/components/settings/public-booking-settings-form";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const ColorSwatch = ({ themeKey }: { themeKey: ColorTheme }) => {
    const themeInfo = colorThemes[themeKey];
    const isSelected = colorTheme === themeKey;

    return (
      <button
        onClick={() => setColorTheme(themeKey)}
        className={cn(
          "group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:scale-105",
          isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-border hover:border-muted-foreground/50"
        )}
        title={themeInfo.name}
      >
        <div
          className="h-8 w-8 rounded-full shadow-sm"
          style={{ backgroundColor: themeInfo.primary }}
        />
        <span className="text-[10px] font-medium text-center truncate w-full">
          {themeInfo.year || themeInfo.name.split(" ")[0]}
        </span>
        {isSelected && (
          <div
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: themeInfo.primary }}
          >
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your preferences</p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="appearance" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Appearance</span>
            <span className="sm:hidden">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Tax Configuration</span>
            <span className="sm:hidden">Tax</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Payments</span>
            <span className="sm:hidden">Pay</span>
          </TabsTrigger>
          <TabsTrigger value="public-booking" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Public Booking</span>
            <span className="sm:hidden">Booking</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mode Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {themeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={theme === option.value ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setTheme(option.value)}
                    >
                      <option.icon className="h-4 w-4 mr-1.5" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Primary</Button>
                  <Button size="sm" variant="secondary">Secondary</Button>
                  <Button size="sm" variant="outline">Outline</Button>
                  <div className="h-2 flex-1 min-w-[60px] rounded-full bg-primary self-center" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Base Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Base Colors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {baseThemes.map((themeKey) => (
                  <ColorSwatch key={themeKey} themeKey={themeKey} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pantone Colors */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <CardTitle className="text-base">Pantone Color of the Year</CardTitle>
                <span className="text-xs text-muted-foreground">2005 - 2025</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-11 lg:grid-cols-21 gap-2">
                {pantoneThemes.map((themeKey) => (
                  <ColorSwatch key={themeKey} themeKey={themeKey} />
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <Label className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{colorThemes[colorTheme].name}</span>
                  {colorThemes[colorTheme].year && (
                    <span className="ml-1">({colorThemes[colorTheme].year})</span>
                  )}
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <TaxConfigForm />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentSettingsForm />
        </TabsContent>

        <TabsContent value="public-booking">
          <PublicBookingSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
