"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  FileText,
  CreditCard,
  Settings2,
  Loader2,
  Save,
  Plus,
  Trash2,
  Info,
  Globe,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORTED_COUNTRIES,
  getCountryConfig,
  CountryTaxConfig,
  TaxRate,
  TaxCode,
} from "@/lib/tax/countries";

interface TaxFormData {
  countryCode: string;
  registrationNumber: string;
  legalName: string;
  tradeName: string;
  businessType: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    stateCode: string;
    postalCode: string;
    country: string;
  };
  email: string;
  phone: string;
  registrationType: string;
  defaultTaxRate: number;
  taxRates: TaxRate[];
  taxCodes: TaxCode[];
  invoiceSettings: {
    prefix: string;
    startingNumber: number;
    currentNumber: number;
    showQRCode: boolean;
    showLogo: boolean;
    termsAndConditions: string;
    notes: string;
    bankDetails: {
      bankName: string;
      accountNumber: string;
      routingCode: string;
      branchName: string;
      accountType: string;
      swiftCode: string;
    };
  };
  digitalCompliance: {
    enabled: boolean;
    systemType: string;
    apiCredentials: {
      username: string;
      password: string;
      apiKey: string;
    };
    sandbox: boolean;
    deviceSerialNumber: string;
  };
  countrySpecific: Record<string, unknown>;
  financialYear: {
    startMonth: number;
    startDay: number;
  };
}

const getDefaultFormData = (countryConfig: CountryTaxConfig): TaxFormData => ({
  countryCode: countryConfig.countryCode,
  registrationNumber: "",
  legalName: "",
  tradeName: "",
  businessType: countryConfig.businessTypes[0]?.value || "",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    stateCode: "",
    postalCode: "",
    country: countryConfig.countryName,
  },
  email: "",
  phone: "",
  registrationType: countryConfig.registrationTypes[0]?.value || "",
  defaultTaxRate: countryConfig.defaultTaxRates.find((r) => r.isDefault)?.rate || 0,
  taxRates: [...countryConfig.defaultTaxRates],
  taxCodes: [...countryConfig.defaultTaxCodes],
  invoiceSettings: {
    prefix: "INV",
    startingNumber: 1,
    currentNumber: 1,
    showQRCode: true,
    showLogo: true,
    termsAndConditions: "",
    notes: "",
    bankDetails: {
      bankName: "",
      accountNumber: "",
      routingCode: "",
      branchName: "",
      accountType: "current",
      swiftCode: "",
    },
  },
  digitalCompliance: {
    enabled: false,
    systemType: "",
    apiCredentials: {
      username: "",
      password: "",
      apiKey: "",
    },
    sandbox: true,
    deviceSerialNumber: "",
  },
  countrySpecific: {},
  financialYear: {
    startMonth: countryConfig.defaultFinancialYearStart.month,
    startDay: countryConfig.defaultFinancialYearStart.day,
  },
});

export function TaxConfigForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configExists, setConfigExists] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("IN");
  const [countryConfig, setCountryConfig] = useState<CountryTaxConfig | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TaxFormData>();

  const taxRates = watch("taxRates");
  const taxCodes = watch("taxCodes");
  const selectedState = watch("address.state");
  const digitalComplianceEnabled = watch("digitalCompliance.enabled");

  const loadCountryConfig = useCallback((countryCode: string) => {
    const config = getCountryConfig(countryCode);
    if (config) {
      setCountryConfig(config);
      return config;
    }
    return null;
  }, []);

  useEffect(() => {
    fetchTaxConfig();
  }, []);

  useEffect(() => {
    if (selectedState && countryConfig?.states) {
      const state = countryConfig.states.find((s) => s.name === selectedState);
      if (state) {
        setValue("address.stateCode", state.code);
      }
    }
  }, [selectedState, countryConfig, setValue]);

  const fetchTaxConfig = async () => {
    try {
      const res = await fetch("/api/tax-config");
      const data = await res.json();

      if (data.success && data.data) {
        const config = loadCountryConfig(data.data.countryCode);
        if (config) {
          setSelectedCountry(data.data.countryCode);
          reset(data.data);
          setConfigExists(true);
        }
      } else {
        // No existing config, use default India
        const config = loadCountryConfig("IN");
        if (config) {
          reset(getDefaultFormData(config));
        }
      }
    } catch {
      toast.error("Failed to load tax configuration");
      const config = loadCountryConfig("IN");
      if (config) {
        reset(getDefaultFormData(config));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const config = loadCountryConfig(countryCode);
    if (config) {
      setSelectedCountry(countryCode);
      const currentData = watch();
      // Preserve common data, reset country-specific
      reset({
        ...getDefaultFormData(config),
        legalName: currentData.legalName,
        tradeName: currentData.tradeName,
        email: currentData.email,
        phone: currentData.phone,
        invoiceSettings: {
          ...currentData.invoiceSettings,
          bankDetails: currentData.invoiceSettings?.bankDetails || getDefaultFormData(config).invoiceSettings.bankDetails,
        },
      });
    }
  };

  const onSubmit = async (data: TaxFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/tax-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save");
      }

      toast.success("Tax configuration saved successfully");
      setConfigExists(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tax configuration");
    } finally {
      setSaving(false);
    }
  };

  // Helper to update country-specific fields
  const setCountrySpecificValue = (fieldName: string, value: unknown) => {
    const current = watch("countrySpecific") || {};
    setValue("countrySpecific", { ...current, [fieldName]: value });
  };

  const getCountrySpecificValue = (fieldName: string) => {
    const current = watch("countrySpecific") || {};
    return current[fieldName];
  };

  const addTaxRate = () => {
    const currentRates = taxRates || [];
    setValue("taxRates", [
      ...currentRates,
      { name: "", rate: 0, code: "", description: "", isDefault: false, category: "" },
    ]);
  };

  const removeTaxRate = (index: number) => {
    const currentRates = taxRates || [];
    setValue("taxRates", currentRates.filter((_, i) => i !== index));
  };

  const addTaxCode = () => {
    const currentCodes = taxCodes || [];
    setValue("taxCodes", [
      ...currentCodes,
      { code: "", description: "", rate: 0, category: "" },
    ]);
  };

  const removeTaxCode = (index: number) => {
    const currentCodes = taxCodes || [];
    setValue("taxCodes", currentCodes.filter((_, i) => i !== index));
  };

  if (loading || !countryConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const routingCodeLabel = selectedCountry === "IN" ? "IFSC Code" :
    selectedCountry === "AE" ? "IBAN" :
    selectedCountry === "KE" ? "Bank Code" : "Routing Number";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tax Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure your {countryConfig.taxName} details for invoicing and compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {configExists && <Badge variant="secondary">Configured</Badge>}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Country Selection Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <CardTitle className="text-base">Country & Tax System</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tax System</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{countryConfig.taxName}</span>
                <span className="text-xs text-muted-foreground">({countryConfig.taxAuthority})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["business", "address"]} className="space-y-2">
        {/* Business Details */}
        <AccordionItem value="business" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Business Details</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">
                  {countryConfig.registrationNumberName} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="registrationNumber"
                  placeholder={countryConfig.registrationNumberPlaceholder}
                  {...register("registrationNumber", { required: `${countryConfig.registrationNumberName} is required` })}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">{countryConfig.registrationNumberHelpText}</p>
                {errors.registrationNumber && (
                  <p className="text-xs text-destructive">{errors.registrationNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalName">
                  Legal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="legalName"
                  placeholder="As per registration"
                  {...register("legalName", { required: "Legal name is required" })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeName">Trade Name</Label>
                <Input
                  id="tradeName"
                  placeholder="Business trading name"
                  {...register("tradeName")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select
                  value={watch("businessType")}
                  onValueChange={(value) => setValue("businessType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryConfig.businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationType">Registration Type</Label>
                <Select
                  value={watch("registrationType")}
                  onValueChange={(value) => setValue("registrationType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryConfig.registrationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="business@example.com"
                  {...register("email")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  {...register("phone")}
                />
              </div>

              {/* Country-specific fields for business section */}
              {countryConfig.customFields
                .filter((f) => f.section === "business")
                .map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {field.type === "text" && (
                      <Input
                        id={field.name}
                        placeholder={field.placeholder}
                        value={(getCountrySpecificValue(field.name) as string) || ""}
                        onChange={(e) => setCountrySpecificValue(field.name, e.target.value)}
                        className={field.uppercase ? "uppercase" : ""}
                        maxLength={field.maxLength}
                      />
                    )}
                    {field.type === "select" && field.name === "emirate" && countryConfig.states && (
                      <Select
                        value={(getCountrySpecificValue(field.name) as string) || ""}
                        onValueChange={(value) => setCountrySpecificValue(field.name, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {countryConfig.states.map((state) => (
                            <SelectItem key={state.code} value={state.name}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground">{field.helpText}</p>
                    )}
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Address */}
        <AccordionItem value="address" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Registered Address</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  placeholder="Building, Street"
                  {...register("address.line1")}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  placeholder="Area, Landmark"
                  {...register("address.line2")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  {...register("address.city")}
                />
              </div>

              {countryConfig.hasStates && countryConfig.states && (
                <div className="space-y-2">
                  <Label htmlFor="state">{countryConfig.stateLabel}</Label>
                  <Select
                    value={watch("address.state")}
                    onValueChange={(value) => setValue("address.state", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${countryConfig.stateLabel?.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {countryConfig.states.map((state) => (
                        <SelectItem key={state.code} value={state.name}>
                          {state.code} - {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="stateCode">{countryConfig.stateLabel} Code</Label>
                <Input
                  id="stateCode"
                  placeholder="Auto-filled"
                  {...register("address.stateCode")}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="Postal/ZIP code"
                  {...register("address.postalCode")}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tax Rates */}
        <AccordionItem value="taxRates" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{countryConfig.taxName} Rates</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Configure {countryConfig.taxName} rates for different services
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addTaxRate}>
                  <Plus className="h-4 w-4 mr-1" /> Add Rate
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate (%)</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px]">Default</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRates?.map((rate, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="Rate name"
                          {...register(`taxRates.${index}.name`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="0"
                          {...register(`taxRates.${index}.rate`, { valueAsNumber: true })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Code"
                          {...register(`taxRates.${index}.code`)}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Description"
                          {...register(`taxRates.${index}.description`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rate.isDefault}
                          onCheckedChange={(checked) => {
                            const newRates = taxRates.map((r, i) => ({
                              ...r,
                              isDefault: i === index ? checked : false,
                            }));
                            setValue("taxRates", newRates);
                            if (checked) {
                              setValue("defaultTaxRate", rate.rate);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeTaxRate(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Country-specific tax fields */}
              {countryConfig.customFields
                .filter((f) => f.section === "tax")
                .map((field) => (
                  <div key={field.name} className="flex items-center gap-4">
                    {field.type === "switch" && (
                      <>
                        <Switch
                          id={field.name}
                          checked={!!getCountrySpecificValue(field.name)}
                          onCheckedChange={(checked) => setCountrySpecificValue(field.name, checked)}
                        />
                        <Label htmlFor={field.name} className="text-sm">
                          {field.label}
                        </Label>
                        {field.helpText && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-64 text-xs">{field.helpText}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </>
                    )}
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tax Codes */}
        <AccordionItem value="taxCodes" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{countryConfig.taxCodeName}s</span>
              <Badge variant="secondary" className="ml-2">{taxCodes?.length || 0}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {countryConfig.taxCodeName}s for healthcare services
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addTaxCode}>
                  <Plus className="h-4 w-4 mr-1" /> Add Code
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{countryConfig.taxCodeName}</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>{countryConfig.taxName} Rate (%)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxCodes?.map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="Code"
                          {...register(`taxCodes.${index}.code`)}
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Service description"
                          {...register(`taxCodes.${index}.description`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="0"
                          {...register(`taxCodes.${index}.rate`, { valueAsNumber: true })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Category"
                          {...register(`taxCodes.${index}.category`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeTaxCode(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Invoice Settings */}
        <AccordionItem value="invoice" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Invoice Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  placeholder="INV"
                  {...register("invoiceSettings.prefix")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startingNumber">Starting Number</Label>
                <Input
                  id="startingNumber"
                  type="number"
                  placeholder="1"
                  {...register("invoiceSettings.startingNumber", { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showQR"
                  checked={watch("invoiceSettings.showQRCode")}
                  onCheckedChange={(checked) => setValue("invoiceSettings.showQRCode", checked)}
                />
                <Label htmlFor="showQR">Show QR Code on Invoice</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showLogo"
                  checked={watch("invoiceSettings.showLogo")}
                  onCheckedChange={(checked) => setValue("invoiceSettings.showLogo", checked)}
                />
                <Label htmlFor="showLogo">Show Logo on Invoice</Label>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  placeholder="Enter invoice terms and conditions..."
                  rows={3}
                  {...register("invoiceSettings.termsAndConditions")}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Invoice Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes for invoices..."
                  rows={2}
                  {...register("invoiceSettings.notes")}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Bank Details (for invoices)</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="Bank name"
                    {...register("invoiceSettings.bankDetails.bankName")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Account number"
                    {...register("invoiceSettings.bankDetails.accountNumber")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routingCode">{routingCodeLabel}</Label>
                  <Input
                    id="routingCode"
                    placeholder={routingCodeLabel}
                    {...register("invoiceSettings.bankDetails.routingCode")}
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    placeholder="Branch name"
                    {...register("invoiceSettings.bankDetails.branchName")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select
                    value={watch("invoiceSettings.bankDetails.accountType")}
                    onValueChange={(value) => setValue("invoiceSettings.bankDetails.accountType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swiftCode">SWIFT Code</Label>
                  <Input
                    id="swiftCode"
                    placeholder="SWIFT/BIC code"
                    {...register("invoiceSettings.bankDetails.swiftCode")}
                    className="uppercase"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Digital Compliance */}
        {(countryConfig.features.eInvoicing || countryConfig.features.digitalTaxRegister) && (
          <AccordionItem value="compliance" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Digital Compliance</span>
                {digitalComplianceEnabled && (
                  <Badge variant="default" className="ml-2">Active</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {countryConfig.features.eInvoicing ? "E-Invoicing" : "Digital Tax Register"}
                      </CardTitle>
                      <Switch
                        checked={watch("digitalCompliance.enabled")}
                        onCheckedChange={(checked) => setValue("digitalCompliance.enabled", checked)}
                      />
                    </div>
                    <CardDescription>
                      {selectedCountry === "IN" && "Generate e-invoices for B2B transactions (mandatory for turnover > ₹5 Cr)"}
                      {selectedCountry === "PH" && "Computerized Accounting System (CAS) for BIR compliance"}
                      {selectedCountry === "KE" && "TIMS integration for KRA compliance"}
                    </CardDescription>
                  </CardHeader>
                  {digitalComplianceEnabled && (
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="apiUsername">API Username</Label>
                          <Input
                            id="apiUsername"
                            placeholder="API username"
                            {...register("digitalCompliance.apiCredentials.username")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apiPassword">API Password</Label>
                          <Input
                            id="apiPassword"
                            type="password"
                            placeholder="API password"
                            {...register("digitalCompliance.apiCredentials.password")}
                          />
                        </div>
                      </div>

                      {countryConfig.features.digitalTaxRegister && (
                        <div className="space-y-2">
                          <Label htmlFor="deviceSerial">Device Serial Number</Label>
                          <Input
                            id="deviceSerial"
                            placeholder="ETR/Register serial number"
                            {...register("digitalCompliance.deviceSerialNumber")}
                          />
                          <p className="text-xs text-muted-foreground">
                            Electronic Tax Register or fiscal device serial number
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="sandbox"
                          checked={watch("digitalCompliance.sandbox")}
                          onCheckedChange={(checked) => setValue("digitalCompliance.sandbox", checked)}
                        />
                        <Label htmlFor="sandbox">Sandbox Mode (for testing)</Label>
                      </div>

                      {/* Country-specific compliance fields */}
                      {countryConfig.customFields
                        .filter((f) => f.section === "compliance")
                        .map((field) => (
                          <div key={field.name} className="space-y-2">
                            {field.type === "text" && (
                              <>
                                <Label htmlFor={field.name}>{field.label}</Label>
                                <Input
                                  id={field.name}
                                  placeholder={field.placeholder}
                                  value={(getCountrySpecificValue(field.name) as string) || ""}
                                  onChange={(e) => setCountrySpecificValue(field.name, e.target.value)}
                                />
                                {field.helpText && (
                                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                                )}
                              </>
                            )}
                            {field.type === "switch" && (
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={field.name}
                                  checked={!!getCountrySpecificValue(field.name)}
                                  onCheckedChange={(checked) => setCountrySpecificValue(field.name, checked)}
                                />
                                <Label htmlFor={field.name}>{field.label}</Label>
                              </div>
                            )}
                          </div>
                        ))}
                    </CardContent>
                  )}
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Additional Settings */}
        <AccordionItem value="additional" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span>Additional Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Financial Year Start</Label>
                <div className="flex gap-2">
                  <Select
                    value={watch("financialYear.startMonth")?.toString()}
                    onValueChange={(value) => setValue("financialYear.startMonth", parseInt(value))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((month, index) => (
                        <SelectItem key={month} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Day"
                    {...register("financialYear.startDay", { valueAsNumber: true })}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Country-specific additional fields */}
              {countryConfig.customFields
                .filter((f) => f.section === "additional")
                .map((field) => (
                  <div key={field.name} className="flex items-center space-x-2">
                    {field.type === "switch" && (
                      <>
                        <Switch
                          id={field.name}
                          checked={!!getCountrySpecificValue(field.name)}
                          onCheckedChange={(checked) => setCountrySpecificValue(field.name, checked)}
                        />
                        <Label htmlFor={field.name}>{field.label}</Label>
                        {field.helpText && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-64 text-xs">{field.helpText}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </>
                    )}
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </form>
  );
}
