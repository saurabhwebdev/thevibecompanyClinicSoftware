"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Globe, Copy, ExternalLink, Check, Info, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PublicBookingSettings {
  isEnabled: boolean;
  bookingSlug: string;
  clinicName: string;
  clinicDescription?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  requirePhoneNumber: boolean;
  requireEmail: boolean;
  showDoctorFees: boolean;
  confirmationMessage?: string;
  termsAndConditions?: string;
  cancellationPolicy?: string;
  captchaEnabled: boolean;
  captchaSiteKey?: string;
  captchaSecretKey?: string;
}

const defaultSettings: PublicBookingSettings = {
  isEnabled: false,
  bookingSlug: "",
  clinicName: "",
  clinicDescription: "",
  clinicAddress: "",
  clinicPhone: "",
  clinicEmail: "",
  requirePhoneNumber: true,
  requireEmail: true,
  showDoctorFees: true,
  confirmationMessage: "",
  termsAndConditions: "",
  cancellationPolicy: "",
  captchaEnabled: false,
  captchaSiteKey: "",
  captchaSecretKey: "",
};

export function PublicBookingSettingsForm() {
  const [settings, setSettings] = useState<PublicBookingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [taxConfigExists, setTaxConfigExists] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/public-booking-settings");
      const result = await response.json();
      if (result.success) {
        setSettings({ ...defaultSettings, ...result.data });
        setTaxConfigExists(result.taxConfigExists || false);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (settings.isEnabled && !settings.bookingSlug) {
      toast.error("Please set a booking URL slug to enable public booking");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/public-booking-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Settings saved successfully");
        setSettings({ ...defaultSettings, ...result.data });
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = () => {
    const slug = settings.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setSettings({ ...settings, bookingSlug: slug });
  };

  const getBookingUrl = () => {
    if (typeof window !== "undefined" && settings.bookingSlug) {
      return `${window.location.origin}/book/${settings.bookingSlug}`;
    }
    return "";
  };

  const copyToClipboard = async () => {
    const url = getBookingUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Public Booking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Booking
              </CardTitle>
              <CardDescription>
                Allow patients to book appointments directly from your website
              </CardDescription>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, isEnabled: checked })}
            />
          </div>
        </CardHeader>
        {settings.isEnabled && settings.bookingSlug && (
          <CardContent>
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm font-medium">{getBookingUrl()}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getBookingUrl(), "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Booking URL Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Booking URL</CardTitle>
          <CardDescription>
            Set a unique URL for your public booking page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL Slug</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center">
                <span className="text-sm text-muted-foreground mr-1">/book/</span>
                <Input
                  value={settings.bookingSlug}
                  onChange={(e) => setSettings({ ...settings, bookingSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="your-clinic-name"
                  className="flex-1"
                />
              </div>
              <Button variant="outline" onClick={generateSlug} disabled={!settings.clinicName}>
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use only lowercase letters, numbers, and hyphens
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Clinic Information</CardTitle>
          <CardDescription>
            Information displayed on the public booking page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taxConfigExists ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Clinic information is automatically pulled from your Tax Configuration settings and cannot be edited here.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please configure your business details in the Tax Configuration tab first. Clinic information will be automatically displayed here.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input
                value={settings.clinicName}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.clinicEmail || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={settings.clinicPhone || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={settings.clinicAddress || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={settings.clinicDescription || ""}
              onChange={(e) => setSettings({ ...settings, clinicDescription: e.target.value })}
              placeholder="Brief description of your clinic (this can be customized for the booking page)..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(settings.clinicDescription || "").length}/500
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Booking Options */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Options</CardTitle>
          <CardDescription>
            Configure what information is required for booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Phone Number</Label>
              <p className="text-sm text-muted-foreground">
                Patients must provide a phone number when booking
              </p>
            </div>
            <Switch
              checked={settings.requirePhoneNumber}
              onCheckedChange={(checked) => setSettings({ ...settings, requirePhoneNumber: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Require Email</Label>
              <p className="text-sm text-muted-foreground">
                Patients must provide an email when booking
              </p>
            </div>
            <Switch
              checked={settings.requireEmail}
              onCheckedChange={(checked) => setSettings({ ...settings, requireEmail: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Doctor Fees</Label>
              <p className="text-sm text-muted-foreground">
                Display consultation fees on the booking page
              </p>
            </div>
            <Switch
              checked={settings.showDoctorFees}
              onCheckedChange={(checked) => setSettings({ ...settings, showDoctorFees: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* CAPTCHA Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            CAPTCHA Security
          </CardTitle>
          <CardDescription>
            Protect your booking form from spam and bots using Friendly Captcha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable CAPTCHA</Label>
              <p className="text-sm text-muted-foreground">
                Require CAPTCHA verification before booking
              </p>
            </div>
            <Switch
              checked={settings.captchaEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, captchaEnabled: checked })}
            />
          </div>

          {settings.captchaEnabled && (
            <>
              <Separator />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Get your free Friendly Captcha keys at{" "}
                  <a
                    href="https://friendlycaptcha.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    friendlycaptcha.com
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Site Key</Label>
                <Input
                  value={settings.captchaSiteKey || ""}
                  onChange={(e) => setSettings({ ...settings, captchaSiteKey: e.target.value })}
                  placeholder="Your Friendly Captcha site key"
                />
              </div>

              <div className="space-y-2">
                <Label>Secret Key (API Key)</Label>
                <Input
                  type="password"
                  value={settings.captchaSecretKey || ""}
                  onChange={(e) => setSettings({ ...settings, captchaSecretKey: e.target.value })}
                  placeholder="Your Friendly Captcha API key"
                />
                <p className="text-xs text-muted-foreground">
                  The API key is used to verify CAPTCHA responses on the server
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages & Policies</CardTitle>
          <CardDescription>
            Customize messages shown to patients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Confirmation Message</Label>
            <Textarea
              value={settings.confirmationMessage || ""}
              onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
              placeholder="Thank you for booking an appointment with us. We look forward to seeing you!"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea
              value={settings.termsAndConditions || ""}
              onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
              placeholder="Enter any terms and conditions that patients must agree to..."
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label>Cancellation Policy</Label>
            <Textarea
              value={settings.cancellationPolicy || ""}
              onChange={(e) => setSettings({ ...settings, cancellationPolicy: e.target.value })}
              placeholder="Please cancel at least 24 hours before your appointment..."
              rows={3}
              maxLength={1000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
