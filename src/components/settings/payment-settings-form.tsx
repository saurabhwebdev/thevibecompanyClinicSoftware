"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Smartphone,
  CreditCard,
  QrCode,
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Building,
  Wallet,
  Phone,
  Banknote,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { PaymentConfig, PaymentGateway, LocalPaymentMethod } from "@/lib/tax/countries";

// Icon mapping for local payment methods
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote,
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  Phone,
  Globe,
};

interface UPISettings {
  enabled: boolean;
  vpa: string;
  merchantName: string;
  merchantCode?: string;
  showQROnInvoice: boolean;
}

interface RazorpaySettings {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  accountId?: string;
  sandbox: boolean;
  autoCapture: boolean;
  paymentMethods: {
    card: boolean;
    upi: boolean;
    netbanking: boolean;
    wallet: boolean;
    emi: boolean;
  };
}

type GatewaySettings = Record<string, Record<string, unknown>>;

interface PaymentSettingsData {
  countryCode: string;
  paymentConfig?: PaymentConfig;
  upiSettings: UPISettings;
  razorpaySettings: RazorpaySettings;
  gatewaySettings: GatewaySettings;
}

export function PaymentSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const [countryCode, setCountryCode] = useState<string>("IN");
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | undefined>();

  const [upiSettings, setUpiSettings] = useState<UPISettings>({
    enabled: false,
    vpa: "",
    merchantName: "",
    merchantCode: "",
    showQROnInvoice: true,
  });

  const [razorpaySettings, setRazorpaySettings] = useState<RazorpaySettings>({
    enabled: false,
    keyId: "",
    keySecret: "",
    webhookSecret: "",
    accountId: "",
    sandbox: true,
    autoCapture: true,
    paymentMethods: {
      card: true,
      upi: true,
      netbanking: true,
      wallet: true,
      emi: false,
    },
  });

  const [gatewaySettings, setGatewaySettings] = useState<GatewaySettings>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/payment-settings");
      const data = await res.json();

      if (data.success && data.data) {
        const settings: PaymentSettingsData = data.data;
        setCountryCode(settings.countryCode || "IN");
        setPaymentConfig(settings.paymentConfig);

        if (settings.upiSettings) {
          setUpiSettings(settings.upiSettings);
        }
        if (settings.razorpaySettings) {
          setRazorpaySettings(settings.razorpaySettings);
        }
        if (settings.gatewaySettings) {
          setGatewaySettings(settings.gatewaySettings);
        }
      }
    } catch (error) {
      console.error("Failed to fetch payment settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiSettings,
          razorpaySettings,
          gatewaySettings,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Payment settings saved successfully");
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSecretVisibility = (fieldId: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const updateGatewayField = (gatewayId: string, fieldName: string, value: unknown) => {
    setGatewaySettings((prev) => ({
      ...prev,
      [gatewayId]: {
        ...prev[gatewayId],
        [fieldName]: value,
      },
    }));
  };

  // Generate UPI QR code preview URL
  const getUPIQRPreview = () => {
    if (!upiSettings.vpa || !upiSettings.merchantName) return null;
    const upiString = `upi://pay?pa=${encodeURIComponent(upiSettings.vpa)}&pn=${encodeURIComponent(upiSettings.merchantName)}&am=100&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiString)}`;
  };

  // Check if a gateway is India-specific (Razorpay, PayU)
  const isIndiaGateway = (gatewayId: string) => {
    return ["razorpay", "payu"].includes(gatewayId);
  };

  // Get tab items based on country
  const getTabItems = () => {
    const items: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];

    // Add UPI for India
    if (countryCode === "IN") {
      items.push({ id: "upi", label: "UPI Settings", icon: QrCode });
    }

    // Add gateways from payment config
    if (paymentConfig?.gateways) {
      for (const gateway of paymentConfig.gateways) {
        // Special handling for Razorpay (existing UI)
        if (gateway.id === "razorpay") {
          items.push({ id: "razorpay", label: "Razorpay", icon: CreditCard });
        } else {
          items.push({ id: gateway.id, label: gateway.name, icon: CreditCard });
        }
      }
    }

    return items;
  };

  // Render gateway settings form
  const renderGatewaySettings = (gateway: PaymentGateway) => {
    const settings = gatewaySettings[gateway.id] || { enabled: false };
    const isEnabled = settings.enabled as boolean;

    return (
      <Card key={gateway.id}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {gateway.name}
              </CardTitle>
              <CardDescription>{gateway.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`${gateway.id}-enabled`} className="text-sm">
                Enable
              </Label>
              <Switch
                id={`${gateway.id}-enabled`}
                checked={isEnabled}
                onCheckedChange={(checked) =>
                  updateGatewayField(gateway.id, "enabled", checked)
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEnabled ? (
            <>
              {/* Features badges */}
              <div className="flex flex-wrap gap-2">
                {gateway.features.map((feature) => (
                  <Badge key={feature} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>

              {/* Dynamic settings fields */}
              <div className="grid gap-4 md:grid-cols-2">
                {gateway.settingsFields.map((field) => {
                  const fieldId = `${gateway.id}-${field.name}`;
                  const value = settings[field.name] as string | boolean | undefined;

                  if (field.type === "switch") {
                    return (
                      <div
                        key={field.name}
                        className="flex items-center justify-between p-3 border rounded-lg col-span-2 md:col-span-1"
                      >
                        <div>
                          <p className="font-medium text-sm">{field.label}</p>
                          {field.helpText && (
                            <p className="text-xs text-muted-foreground">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={(value as boolean) || false}
                          onCheckedChange={(checked) =>
                            updateGatewayField(gateway.id, field.name, checked)
                          }
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={fieldId}>
                        {field.label}
                        {field.required && " *"}
                      </Label>
                      <div className="relative">
                        <Input
                          id={fieldId}
                          type={
                            field.type === "password" && !visibleSecrets[fieldId]
                              ? "password"
                              : "text"
                          }
                          placeholder={field.placeholder}
                          value={(value as string) || ""}
                          onChange={(e) =>
                            updateGatewayField(gateway.id, field.name, e.target.value)
                          }
                        />
                        {field.type === "password" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => toggleSecretVisibility(fieldId)}
                          >
                            {visibleSecrets[fieldId] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      {field.helpText && (
                        <p className="text-xs text-muted-foreground">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Link to gateway dashboard */}
              <div className="flex items-center gap-2">
                <a
                  href={gateway.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Go to {gateway.name} Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{gateway.name} Disabled</AlertTitle>
              <AlertDescription>
                Enable {gateway.name} to accept payments through this gateway.
                <a
                  href={gateway.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline inline-flex items-center gap-1"
                >
                  Sign up for {gateway.name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render local payment methods info
  const renderLocalMethodsInfo = () => {
    if (!paymentConfig?.localMethods) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Available Payment Methods
          </CardTitle>
          <CardDescription>
            These payment methods are available at the point of sale based on your country settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {paymentConfig.localMethods.map((method: LocalPaymentMethod) => {
              const IconComponent = iconMap[method.icon] || CreditCard;
              const isActive = paymentConfig.posPaymentMethods.includes(method.id);

              return (
                <div
                  key={method.id}
                  className={`p-3 border rounded-lg ${
                    isActive ? "border-primary bg-primary/5" : "opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    <span className="font-medium text-sm">{method.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {method.description}
                  </p>
                  {isActive && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Active in POS
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabItems = getTabItems();

  return (
    <div className="space-y-6">
      {/* Country info banner */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertTitle>
          Payment settings for{" "}
          {countryCode === "IN"
            ? "India"
            : countryCode === "AE"
            ? "UAE"
            : countryCode === "PH"
            ? "Philippines"
            : countryCode === "KE"
            ? "Kenya"
            : countryCode}
        </AlertTitle>
        <AlertDescription>
          Available payment gateways and methods are based on your tax configuration country.
          Change your country in Tax Configuration to see different options.
        </AlertDescription>
      </Alert>

      {/* Local payment methods overview */}
      {renderLocalMethodsInfo()}

      <Separator />

      {/* Gateway configuration tabs */}
      <Tabs defaultValue={tabItems[0]?.id || "upi"} className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            {tabItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <TabsTrigger key={item.id} value={item.id} className="gap-2">
                  <IconComponent className="h-4 w-4" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* UPI Settings Tab (India only) */}
        {countryCode === "IN" && (
          <TabsContent value="upi" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      UPI Payment Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure your UPI details to display QR code on invoices for easy payments
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="upi-enabled" className="text-sm">
                      Enable UPI
                    </Label>
                    <Switch
                      id="upi-enabled"
                      checked={upiSettings.enabled}
                      onCheckedChange={(checked) =>
                        setUpiSettings({ ...upiSettings, enabled: checked })
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {upiSettings.enabled && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="vpa">UPI ID / VPA *</Label>
                        <Input
                          id="vpa"
                          placeholder="yourname@upi"
                          value={upiSettings.vpa}
                          onChange={(e) =>
                            setUpiSettings({ ...upiSettings, vpa: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Virtual Payment Address (e.g., business@paytm, name@okicici)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="merchantName">Merchant Name *</Label>
                        <Input
                          id="merchantName"
                          placeholder="Your Business Name"
                          value={upiSettings.merchantName}
                          onChange={(e) =>
                            setUpiSettings({
                              ...upiSettings,
                              merchantName: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Name displayed to customers when paying
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="merchantCode">
                          Merchant Category Code (Optional)
                        </Label>
                        <Input
                          id="merchantCode"
                          placeholder="5411"
                          value={upiSettings.merchantCode || ""}
                          onChange={(e) =>
                            setUpiSettings({
                              ...upiSettings,
                              merchantCode: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          MCC code for business category
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Invoice Display</Label>
                        <div className="flex items-center gap-2 p-3 border rounded-lg">
                          <Switch
                            id="showQROnInvoice"
                            checked={upiSettings.showQROnInvoice}
                            onCheckedChange={(checked) =>
                              setUpiSettings({
                                ...upiSettings,
                                showQROnInvoice: checked,
                              })
                            }
                          />
                          <Label
                            htmlFor="showQROnInvoice"
                            className="text-sm font-normal"
                          >
                            Show UPI QR code on printed invoices
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* QR Preview */}
                    {upiSettings.vpa && upiSettings.merchantName && (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          QR Code Preview
                        </h4>
                        <div className="flex items-start gap-6">
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <img
                              src={getUPIQRPreview() || ""}
                              alt="UPI QR Code"
                              className="w-32 h-32"
                            />
                          </div>
                          <div className="flex-1 space-y-2 text-sm">
                            <p>
                              <span className="text-muted-foreground">UPI ID:</span>{" "}
                              {upiSettings.vpa}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Merchant:</span>{" "}
                              {upiSettings.merchantName}
                            </p>
                            <Alert className="mt-3">
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                This QR code will be displayed on invoices. Customers
                                can scan with any UPI app to pay.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!upiSettings.enabled && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>UPI Disabled</AlertTitle>
                    <AlertDescription>
                      Enable UPI to allow customers to pay via QR code on invoices.
                      This is a popular payment method in India.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Razorpay Settings Tab (India - special handling) */}
        {countryCode === "IN" && (
          <TabsContent value="razorpay" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Razorpay Integration
                    </CardTitle>
                    <CardDescription>
                      Accept online payments via cards, UPI, netbanking, and wallets
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="razorpay-enabled" className="text-sm">
                      Enable Razorpay
                    </Label>
                    <Switch
                      id="razorpay-enabled"
                      checked={razorpaySettings.enabled}
                      onCheckedChange={(checked) =>
                        setRazorpaySettings({ ...razorpaySettings, enabled: checked })
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {razorpaySettings.enabled && (
                  <>
                    {/* Environment Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Environment</p>
                          <p className="text-sm text-muted-foreground">
                            {razorpaySettings.sandbox
                              ? "Test mode - no real transactions"
                              : "Live mode - real transactions"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            razorpaySettings.sandbox ? "secondary" : "default"
                          }
                        >
                          {razorpaySettings.sandbox ? "Sandbox" : "Production"}
                        </Badge>
                        <Switch
                          checked={!razorpaySettings.sandbox}
                          onCheckedChange={(checked) =>
                            setRazorpaySettings({
                              ...razorpaySettings,
                              sandbox: !checked,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* API Credentials */}
                    <div className="space-y-4">
                      <h4 className="font-medium">API Credentials</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="keyId">API Key ID *</Label>
                          <Input
                            id="keyId"
                            placeholder={
                              razorpaySettings.sandbox
                                ? "rzp_test_..."
                                : "rzp_live_..."
                            }
                            value={razorpaySettings.keyId}
                            onChange={(e) =>
                              setRazorpaySettings({
                                ...razorpaySettings,
                                keyId: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="keySecret">API Key Secret *</Label>
                          <div className="relative">
                            <Input
                              id="keySecret"
                              type={visibleSecrets["razorpay-secret"] ? "text" : "password"}
                              placeholder="Your secret key"
                              value={razorpaySettings.keySecret}
                              onChange={(e) =>
                                setRazorpaySettings({
                                  ...razorpaySettings,
                                  keySecret: e.target.value,
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => toggleSecretVisibility("razorpay-secret")}
                            >
                              {visibleSecrets["razorpay-secret"] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="webhookSecret">
                            Webhook Secret (Optional)
                          </Label>
                          <div className="relative">
                            <Input
                              id="webhookSecret"
                              type={visibleSecrets["razorpay-webhook"] ? "text" : "password"}
                              placeholder="Webhook signature secret"
                              value={razorpaySettings.webhookSecret || ""}
                              onChange={(e) =>
                                setRazorpaySettings({
                                  ...razorpaySettings,
                                  webhookSecret: e.target.value,
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => toggleSecretVisibility("razorpay-webhook")}
                            >
                              {visibleSecrets["razorpay-webhook"] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountId">Account ID (Optional)</Label>
                          <Input
                            id="accountId"
                            placeholder="acc_..."
                            value={razorpaySettings.accountId || ""}
                            onChange={(e) =>
                              setRazorpaySettings({
                                ...razorpaySettings,
                                accountId: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href="https://dashboard.razorpay.com/app/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Get your API keys from Razorpay Dashboard
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <Separator />

                    {/* Payment Options */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Payment Methods</h4>
                      <p className="text-sm text-muted-foreground">
                        Select which payment methods to enable for online payments
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { key: "card", label: "Cards", icon: CreditCard },
                          { key: "upi", label: "UPI", icon: Smartphone },
                          { key: "netbanking", label: "Net Banking", icon: Building },
                          { key: "wallet", label: "Wallets", icon: Wallet },
                          { key: "emi", label: "EMI", icon: CreditCard },
                        ].map((method) => (
                          <div
                            key={method.key}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              razorpaySettings.paymentMethods[
                                method.key as keyof typeof razorpaySettings.paymentMethods
                              ]
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground/50"
                            }`}
                            onClick={() =>
                              setRazorpaySettings({
                                ...razorpaySettings,
                                paymentMethods: {
                                  ...razorpaySettings.paymentMethods,
                                  [method.key]:
                                    !razorpaySettings.paymentMethods[
                                      method.key as keyof typeof razorpaySettings.paymentMethods
                                    ],
                                },
                              })
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <method.icon className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {method.label}
                                </span>
                              </div>
                              {razorpaySettings.paymentMethods[
                                method.key as keyof typeof razorpaySettings.paymentMethods
                              ] && <CheckCircle className="h-4 w-4 text-primary" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Additional Settings */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Additional Settings</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Auto Capture Payments</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically capture payments after authorization
                          </p>
                        </div>
                        <Switch
                          checked={razorpaySettings.autoCapture}
                          onCheckedChange={(checked) =>
                            setRazorpaySettings({
                              ...razorpaySettings,
                              autoCapture: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {!razorpaySettings.enabled && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Razorpay Disabled</AlertTitle>
                    <AlertDescription>
                      Enable Razorpay to accept online payments. You&apos;ll need to
                      create a Razorpay account and get your API keys.
                      <a
                        href="https://razorpay.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Sign up for Razorpay
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Dynamic gateway tabs for other gateways */}
        {paymentConfig?.gateways
          .filter((g) => g.id !== "razorpay") // Razorpay has special handling above
          .map((gateway) => (
            <TabsContent key={gateway.id} value={gateway.id} className="space-y-4">
              {renderGatewaySettings(gateway)}
            </TabsContent>
          ))}
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Payment Settings
        </Button>
      </div>
    </div>
  );
}
