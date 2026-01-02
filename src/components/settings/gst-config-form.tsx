"use client";

import { useState, useEffect } from "react";
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

// Indian States with codes
const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

interface GSTRate {
  name: string;
  rate: number;
  sacCode: string;
  description?: string;
  isDefault?: boolean;
}

interface SACCode {
  code: string;
  description: string;
  gstRate: number;
  category: string;
}

interface GSTFormData {
  gstin: string;
  legalName: string;
  tradeName: string;
  businessType: string;
  pan: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    country: string;
  };
  email: string;
  phone: string;
  gstRegistrationType: string;
  defaultPlaceOfSupply: string;
  reverseChargeApplicable: boolean;
  gstRates: GSTRate[];
  defaultGSTRate: number;
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
      ifscCode: string;
      branchName: string;
      accountType: string;
    };
  };
  eInvoiceSettings: {
    enabled: boolean;
    apiUsername: string;
    apiPassword: string;
    sandbox: boolean;
  };
  eWayBillSettings: {
    enabled: boolean;
    autoGenerate: boolean;
    thresholdAmount: number;
  };
  sacCodes: SACCode[];
  financialYear: {
    startMonth: number;
    startDay: number;
  };
  tdsApplicable: boolean;
  tcsApplicable: boolean;
}

const defaultFormData: GSTFormData = {
  gstin: "",
  legalName: "",
  tradeName: "",
  businessType: "proprietorship",
  pan: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    stateCode: "",
    pincode: "",
    country: "India",
  },
  email: "",
  phone: "",
  gstRegistrationType: "regular",
  defaultPlaceOfSupply: "",
  reverseChargeApplicable: false,
  gstRates: [
    { name: "Exempt", rate: 0, sacCode: "9993", description: "Healthcare services", isDefault: false },
    { name: "GST 5%", rate: 5, sacCode: "9993", description: "Medical equipment rental", isDefault: false },
    { name: "GST 12%", rate: 12, sacCode: "9993", description: "Medical supplies", isDefault: false },
    { name: "GST 18%", rate: 18, sacCode: "9983", description: "Other services", isDefault: true },
    { name: "GST 28%", rate: 28, sacCode: "9983", description: "Luxury medical services", isDefault: false },
  ],
  defaultGSTRate: 18,
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
      ifscCode: "",
      branchName: "",
      accountType: "current",
    },
  },
  eInvoiceSettings: {
    enabled: false,
    apiUsername: "",
    apiPassword: "",
    sandbox: true,
  },
  eWayBillSettings: {
    enabled: false,
    autoGenerate: false,
    thresholdAmount: 50000,
  },
  sacCodes: [
    { code: "999311", description: "Hospital services", gstRate: 0, category: "Healthcare" },
    { code: "999312", description: "Medical and dental services", gstRate: 0, category: "Healthcare" },
    { code: "999313", description: "Childbirth and related services", gstRate: 0, category: "Healthcare" },
    { code: "999314", description: "Nursing and physiotherapy services", gstRate: 0, category: "Healthcare" },
    { code: "999315", description: "Ambulance services", gstRate: 0, category: "Healthcare" },
    { code: "999316", description: "Medical laboratory services", gstRate: 0, category: "Healthcare" },
  ],
  financialYear: {
    startMonth: 4,
    startDay: 1,
  },
  tdsApplicable: false,
  tcsApplicable: false,
};

export function GSTConfigForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configExists, setConfigExists] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<GSTFormData>({
    defaultValues: defaultFormData,
  });

  const gstRates = watch("gstRates");
  const sacCodes = watch("sacCodes");
  const selectedState = watch("address.state");
  const eInvoiceEnabled = watch("eInvoiceSettings.enabled");
  const eWayBillEnabled = watch("eWayBillSettings.enabled");

  useEffect(() => {
    fetchGSTConfig();
  }, []);

  useEffect(() => {
    if (selectedState) {
      const state = INDIAN_STATES.find((s) => s.name === selectedState);
      if (state) {
        setValue("address.stateCode", state.code);
        setValue("defaultPlaceOfSupply", state.name);
      }
    }
  }, [selectedState, setValue]);

  const fetchGSTConfig = async () => {
    try {
      const res = await fetch("/api/gst-config");
      const data = await res.json();

      if (data.success && data.data) {
        reset(data.data);
        setConfigExists(true);
      }
    } catch {
      toast.error("Failed to load GST configuration");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: GSTFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/gst-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save");
      }

      toast.success("GST configuration saved successfully");
      setConfigExists(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save GST configuration");
    } finally {
      setSaving(false);
    }
  };

  const addGSTRate = () => {
    const currentRates = gstRates || [];
    setValue("gstRates", [
      ...currentRates,
      { name: "", rate: 0, sacCode: "", description: "", isDefault: false },
    ]);
  };

  const removeGSTRate = (index: number) => {
    const currentRates = gstRates || [];
    setValue(
      "gstRates",
      currentRates.filter((_, i) => i !== index)
    );
  };

  const addSACCode = () => {
    const currentCodes = sacCodes || [];
    setValue("sacCodes", [
      ...currentCodes,
      { code: "", description: "", gstRate: 0, category: "" },
    ]);
  };

  const removeSACCode = (index: number) => {
    const currentCodes = sacCodes || [];
    setValue(
      "sacCodes",
      currentCodes.filter((_, i) => i !== index)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">GST Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure your GST details for invoicing and compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {configExists && (
            <Badge variant="secondary">Configured</Badge>
          )}
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
                <Label htmlFor="gstin">
                  GSTIN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gstin"
                  placeholder="22AAAAA0000A1Z5"
                  {...register("gstin", { required: "GSTIN is required" })}
                  className="uppercase"
                />
                {errors.gstin && (
                  <p className="text-xs text-destructive">{errors.gstin.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan">
                  PAN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pan"
                  placeholder="AAAAA0000A"
                  {...register("pan", { required: "PAN is required" })}
                  className="uppercase"
                />
                {errors.pan && (
                  <p className="text-xs text-destructive">{errors.pan.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalName">
                  Legal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="legalName"
                  placeholder="As per GST registration"
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
                    <SelectItem value="proprietorship">Proprietorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="company">Private Limited Company</SelectItem>
                    <SelectItem value="llp">LLP</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstRegistrationType">Registration Type</Label>
                <Select
                  value={watch("gstRegistrationType")}
                  onValueChange={(value) => setValue("gstRegistrationType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="composition">Composition</SelectItem>
                    <SelectItem value="unregistered">Unregistered</SelectItem>
                    <SelectItem value="consumer">Consumer</SelectItem>
                    <SelectItem value="overseas">Overseas</SelectItem>
                    <SelectItem value="sez">SEZ</SelectItem>
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
                  placeholder="+91 9876543210"
                  {...register("phone")}
                />
              </div>
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

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={watch("address.state")}
                  onValueChange={(value) => setValue("address.state", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.name}>
                        {state.code} - {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stateCode">State Code</Label>
                <Input
                  id="stateCode"
                  placeholder="Auto-filled"
                  {...register("address.stateCode")}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  placeholder="6-digit PIN"
                  {...register("address.pincode")}
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
              <span>Tax Rates</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Configure tax rates for different services
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addGSTRate}>
                  <Plus className="h-4 w-4 mr-1" /> Add Rate
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate (%)</TableHead>
                    <TableHead>SAC Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px]">Default</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gstRates?.map((rate, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="Rate name"
                          {...register(`gstRates.${index}.name`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="0"
                          {...register(`gstRates.${index}.rate`, { valueAsNumber: true })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="SAC"
                          {...register(`gstRates.${index}.sacCode`)}
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Description"
                          {...register(`gstRates.${index}.description`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rate.isDefault}
                          onCheckedChange={(checked) => {
                            const newRates = gstRates.map((r, i) => ({
                              ...r,
                              isDefault: i === index ? checked : false,
                            }));
                            setValue("gstRates", newRates);
                            if (checked) {
                              setValue("defaultGSTRate", rate.rate);
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
                          onClick={() => removeGSTRate(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator />

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="reverseCharge"
                    checked={watch("reverseChargeApplicable")}
                    onCheckedChange={(checked) => setValue("reverseChargeApplicable", checked)}
                  />
                  <Label htmlFor="reverseCharge" className="text-sm">
                    Reverse Charge Applicable
                  </Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-64 text-xs">
                        Enable if reverse charge mechanism is applicable to your business
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SAC Codes */}
        <AccordionItem value="sacCodes" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>SAC Codes</span>
              <Badge variant="secondary" className="ml-2">{sacCodes?.length || 0}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Service Accounting Codes for healthcare services
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addSACCode}>
                  <Plus className="h-4 w-4 mr-1" /> Add SAC Code
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SAC Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>GST Rate (%)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sacCodes?.map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="999XXX"
                          {...register(`sacCodes.${index}.code`)}
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Service description"
                          {...register(`sacCodes.${index}.description`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="0"
                          {...register(`sacCodes.${index}.gstRate`, { valueAsNumber: true })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Category"
                          {...register(`sacCodes.${index}.category`)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeSACCode(index)}
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
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    placeholder="IFSC code"
                    {...register("invoiceSettings.bankDetails.ifscCode")}
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
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* E-Invoice Settings */}
        <AccordionItem value="eInvoice" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>E-Invoice & E-Way Bill</span>
              {(eInvoiceEnabled || eWayBillEnabled) && (
                <Badge variant="default" className="ml-2">Active</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">E-Invoice</CardTitle>
                    <Switch
                      checked={watch("eInvoiceSettings.enabled")}
                      onCheckedChange={(checked) => setValue("eInvoiceSettings.enabled", checked)}
                    />
                  </div>
                  <CardDescription>
                    Generate e-invoices for B2B transactions (mandatory for turnover &gt; 5 Cr)
                  </CardDescription>
                </CardHeader>
                {eInvoiceEnabled && (
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="eInvoiceUsername">API Username</Label>
                        <Input
                          id="eInvoiceUsername"
                          placeholder="API username"
                          {...register("eInvoiceSettings.apiUsername")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eInvoicePassword">API Password</Label>
                        <Input
                          id="eInvoicePassword"
                          type="password"
                          placeholder="API password"
                          {...register("eInvoiceSettings.apiPassword")}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sandbox"
                        checked={watch("eInvoiceSettings.sandbox")}
                        onCheckedChange={(checked) => setValue("eInvoiceSettings.sandbox", checked)}
                      />
                      <Label htmlFor="sandbox">Sandbox Mode (for testing)</Label>
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">E-Way Bill</CardTitle>
                    <Switch
                      checked={watch("eWayBillSettings.enabled")}
                      onCheckedChange={(checked) => setValue("eWayBillSettings.enabled", checked)}
                    />
                  </div>
                  <CardDescription>
                    Generate e-way bills for goods transportation
                  </CardDescription>
                </CardHeader>
                {eWayBillEnabled && (
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoGenerate"
                        checked={watch("eWayBillSettings.autoGenerate")}
                        onCheckedChange={(checked) => setValue("eWayBillSettings.autoGenerate", checked)}
                      />
                      <Label htmlFor="autoGenerate">Auto-generate for eligible invoices</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold">Threshold Amount</Label>
                      <Input
                        id="threshold"
                        type="number"
                        placeholder="50000"
                        {...register("eWayBillSettings.thresholdAmount", { valueAsNumber: true })}
                        className="w-40"
                      />
                      <p className="text-xs text-muted-foreground">
                        E-way bill required for invoices above this amount
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

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

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="tds"
                    checked={watch("tdsApplicable")}
                    onCheckedChange={(checked) => setValue("tdsApplicable", checked)}
                  />
                  <Label htmlFor="tds">TDS Applicable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="tcs"
                    checked={watch("tcsApplicable")}
                    onCheckedChange={(checked) => setValue("tcsApplicable", checked)}
                  />
                  <Label htmlFor="tcs">TCS Applicable</Label>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </form>
  );
}
