"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Loader2,
  X,
  Check,
  Percent,
  IndianRupee,
  Package,
  Printer,
  FileText,
  Clock,
  Building2,
  Zap,
  Wallet,
  Phone,
  Building,
  DollarSign,
  Stethoscope,
  ChevronsUpDown,
} from "lucide-react";
import type { PaymentConfig, LocalPaymentMethod } from "@/lib/tax/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/components/currency-provider";

interface Doctor {
  _id: string;
  name: string;
  email: string;
}

interface Patient {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
}

interface Product {
  _id: string;
  sku: string;
  name: string;
  genericName?: string;
  type: string;
  categoryId: { name: string };
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  currentStock: number;
  unit: string;
  hsnCode?: string;
  sacCode?: string;
}

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

interface TaxBreakdown {
  taxName: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

interface RazorpaySettings {
  enabled: boolean;
  keyId: string;
  sandbox: boolean;
}

// Icon mapping for dynamic payment methods
const paymentIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote,
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  Phone,
  DollarSign,
};

// Declare Razorpay window type
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export default function BillingPage() {
  const { formatCurrency, currency } = useCurrency();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchPatient, setSearchPatient] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openPatientCombobox, setOpenPatientCombobox] = useState(false);

  // Walk-in customer
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");

  // Overall discount
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState<"percentage" | "fixed">("fixed");

  // Payment
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [transactionId, setTransactionId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Invoice created
  const [createdInvoice, setCreatedInvoice] = useState<{
    _id: string;
    invoiceNumber: string;
    grandTotal: number;
  } | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Razorpay
  const [razorpaySettings, setRazorpaySettings] = useState<RazorpaySettings | null>(null);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);
  const [businessName, setBusinessName] = useState("");

  // Dynamic payment config based on country
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [countryCode, setCountryCode] = useState<string>("IN");

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    if (!searchPatient || searchPatient.length < 2) {
      setPatients([]);
      return;
    }

    setIsLoadingPatients(true);
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
      }
    } catch {
      toast.error("Failed to search patients");
    } finally {
      setIsLoadingPatients(false);
    }
  }, [searchPatient]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const searchParam = searchProduct ? `search=${encodeURIComponent(searchProduct)}&` : '';
      const res = await fetch(`/api/products?${searchParam}status=active&limit=20`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch {
      toast.error("Failed to search products");
    } finally {
      setIsLoadingProducts(false);
    }
  }, [searchProduct]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/doctors");
      const data = await res.json();
      if (data.success) {
        setDoctors(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    }
  }, []);

  // Fetch payment settings and doctors on mount
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const [paymentRes, taxRes] = await Promise.all([
          fetch("/api/payment-settings"),
          fetch("/api/tax-config"),
        ]);

        const paymentData = await paymentRes.json();
        const taxData = await taxRes.json();

        if (paymentData.success && paymentData.data) {
          // Get payment config for dynamic payment methods
          if (paymentData.data.paymentConfig) {
            setPaymentConfig(paymentData.data.paymentConfig);
          }
          if (paymentData.data.countryCode) {
            setCountryCode(paymentData.data.countryCode);
          }

          // Razorpay settings
          if (paymentData.data.razorpaySettings?.enabled) {
            setRazorpaySettings({
              enabled: true,
              keyId: paymentData.data.razorpaySettings.keyId,
              sandbox: paymentData.data.razorpaySettings.sandbox,
            });
          }
        }

        if (taxData.success && taxData.data) {
          setBusinessName(taxData.data.tradeName || taxData.data.legalName || "Clinic");
        }
      } catch (error) {
        console.error("Failed to fetch payment settings:", error);
      }
    };

    fetchPaymentSettings();
    fetchDoctors();
  }, [fetchDoctors]);

  // Add to cart
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.productId === product._id);

    if (existingIndex >= 0) {
      // Update quantity
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity < product.currentStock) {
        updatedCart[existingIndex].quantity += 1;
        recalculateItem(updatedCart[existingIndex]);
        setCart(updatedCart);
      } else {
        toast.error("Not enough stock available");
      }
    } else {
      // Add new item
      if (product.currentStock < 1) {
        toast.error("Product is out of stock");
        return;
      }

      const newItem: CartItem = {
        productId: product._id,
        product,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discount: 0,
        discountType: "percentage",
        taxRate: product.taxRate,
        subtotal: product.sellingPrice,
        taxAmount: (product.sellingPrice * product.taxRate) / 100,
        total: product.sellingPrice + (product.sellingPrice * product.taxRate) / 100,
      };
      setCart([...cart, newItem]);
    }

    setSearchProduct("");
    setProducts([]);
  };

  // Recalculate item totals
  const recalculateItem = (item: CartItem) => {
    const subtotal = item.quantity * item.unitPrice;
    let discountAmount = 0;

    if (item.discount > 0) {
      if (item.discountType === "percentage") {
        discountAmount = (subtotal * item.discount) / 100;
      } else {
        discountAmount = item.discount;
      }
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * item.taxRate) / 100;
    const total = taxableAmount + taxAmount;

    item.subtotal = subtotal;
    item.taxAmount = taxAmount;
    item.total = total;
  };

  // Update quantity
  const updateQuantity = (index: number, delta: number) => {
    const updatedCart = [...cart];
    const newQuantity = updatedCart[index].quantity + delta;

    if (newQuantity < 1) {
      return;
    }

    if (newQuantity > updatedCart[index].product.currentStock) {
      toast.error("Not enough stock available");
      return;
    }

    updatedCart[index].quantity = newQuantity;
    recalculateItem(updatedCart[index]);
    setCart(updatedCart);
  };

  // Update item discount
  const updateItemDiscount = (index: number, discount: number, type: "percentage" | "fixed") => {
    const updatedCart = [...cart];
    updatedCart[index].discount = discount;
    updatedCart[index].discountType = type;
    recalculateItem(updatedCart[index]);
    setCart(updatedCart);
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    const taxBreakdown: Record<number, TaxBreakdown> = {};

    cart.forEach((item) => {
      subtotal += item.subtotal;
      totalTax += item.taxAmount;

      if (!taxBreakdown[item.taxRate]) {
        taxBreakdown[item.taxRate] = {
          taxName: `GST ${item.taxRate}%`,
          taxRate: item.taxRate,
          taxableAmount: 0,
          taxAmount: 0,
        };
      }
      taxBreakdown[item.taxRate].taxableAmount += item.subtotal - (item.discountType === "percentage" ? (item.subtotal * item.discount) / 100 : item.discount);
      taxBreakdown[item.taxRate].taxAmount += item.taxAmount;
    });

    let discountAmount = 0;
    if (overallDiscount > 0) {
      if (overallDiscountType === "percentage") {
        discountAmount = (subtotal * overallDiscount) / 100;
      } else {
        discountAmount = overallDiscount;
      }
    }

    const taxableAmount = subtotal - discountAmount;
    const totalAmount = taxableAmount + totalTax;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const grandTotal = Math.round(totalAmount);

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      totalTax,
      totalAmount,
      roundOff,
      grandTotal,
      taxBreakdown: Object.values(taxBreakdown),
    };
  };

  const totals = calculateTotals();

  // Clear all
  const clearAll = () => {
    setCart([]);
    setSelectedPatient(null);
    setSelectedDoctor("");
    setIsWalkIn(false);
    setWalkInName("");
    setWalkInPhone("");
    setOverallDiscount(0);
    setOverallDiscountType("fixed");
    setSearchPatient("");
    setSearchProduct("");
    setInvoiceNotes("");
  };

  // Create invoice
  const createInvoice = async (payFullAmount: boolean) => {
    if (cart.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    if (!selectedPatient && !isWalkIn) {
      toast.error("Please select a patient or use walk-in");
      return;
    }

    if (isWalkIn && (!walkInName || !walkInPhone)) {
      toast.error("Please enter walk-in customer details");
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceData = {
        patientId: selectedPatient?._id,
        doctorId: selectedDoctor && selectedDoctor !== "none" ? selectedDoctor : undefined,
        customerName: isWalkIn ? walkInName : `${selectedPatient?.firstName} ${selectedPatient?.lastName}`,
        customerPhone: isWalkIn ? walkInPhone : selectedPatient?.phone,
        customerEmail: selectedPatient?.email,
        customerAddress: selectedPatient?.address,
        items: cart.map((item) => ({
          productId: item.productId,
          type: item.product.type,
          name: item.product.name,
          description: item.product.genericName,
          hsnCode: item.product.hsnCode,
          sacCode: item.product.sacCode,
          quantity: item.quantity,
          unit: item.product.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          taxRate: item.taxRate,
        })),
        discountAmount: overallDiscount,
        discountType: overallDiscountType,
        notes: invoiceNotes,
        status: payFullAmount ? "paid" : "sent",
        paymentAmount: payFullAmount ? totals.grandTotal : paymentAmount,
        paymentMethod: paymentMethod,
        transactionId: transactionId,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });

      const result = await res.json();

      if (result.success) {
        setCreatedInvoice(result.data);
        setShowPaymentDialog(false);
        setShowSuccessDialog(true);
        clearAll();
      } else {
        toast.error(result.error || "Failed to create invoice");
      }
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open payment dialog
  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    if (!selectedPatient && !isWalkIn) {
      toast.error("Please select a patient or use walk-in");
      return;
    }

    if (isWalkIn && (!walkInName || !walkInPhone)) {
      toast.error("Please enter walk-in customer details");
      return;
    }

    setPaymentAmount(totals.grandTotal);
    setShowPaymentDialog(true);
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    if (!razorpaySettings?.enabled || !isRazorpayLoaded) {
      toast.error("Razorpay is not available");
      return;
    }

    setIsProcessingRazorpay(true);

    try {
      // Create order
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totals.grandTotal,
          currency: "INR",
          notes: {
            customer: isWalkIn ? walkInName : `${selectedPatient?.firstName} ${selectedPatient?.lastName}`,
          },
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.success) {
        toast.error(orderData.error || "Failed to create payment order");
        setIsProcessingRazorpay(false);
        return;
      }

      // Open Razorpay checkout
      const options: RazorpayOptions = {
        key: orderData.data.keyId,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: businessName,
        description: `Payment for ${cart.length} item(s)`,
        order_id: orderData.data.orderId,
        handler: async (response: RazorpayResponse) => {
          // Verify payment
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              // Set transaction ID and complete invoice
              setTransactionId(response.razorpay_payment_id);
              setPaymentMethod("razorpay");

              // Create the invoice with razorpay payment
              const invoiceData = {
                patientId: selectedPatient?._id,
                doctorId: selectedDoctor && selectedDoctor !== "none" ? selectedDoctor : undefined,
                customerName: isWalkIn ? walkInName : `${selectedPatient?.firstName} ${selectedPatient?.lastName}`,
                customerPhone: isWalkIn ? walkInPhone : selectedPatient?.phone,
                customerEmail: selectedPatient?.email,
                customerAddress: selectedPatient?.address,
                items: cart.map((item) => ({
                  productId: item.productId,
                  type: item.product.type,
                  name: item.product.name,
                  description: item.product.genericName,
                  hsnCode: item.product.hsnCode,
                  sacCode: item.product.sacCode,
                  quantity: item.quantity,
                  unit: item.product.unit,
                  unitPrice: item.unitPrice,
                  discount: item.discount,
                  discountType: item.discountType,
                  taxRate: item.taxRate,
                })),
                discountAmount: overallDiscount,
                discountType: overallDiscountType,
                notes: invoiceNotes,
                status: "paid",
                paymentAmount: totals.grandTotal,
                paymentMethod: "razorpay",
                transactionId: response.razorpay_payment_id,
              };

              const invoiceRes = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(invoiceData),
              });

              const invoiceResult = await invoiceRes.json();

              if (invoiceResult.success) {
                setCreatedInvoice(invoiceResult.data);
                setShowPaymentDialog(false);
                setShowSuccessDialog(true);
                clearAll();
                toast.success("Payment successful!");
              } else {
                toast.error(invoiceResult.error || "Failed to create invoice");
              }
            } else {
              toast.error("Payment verification failed");
            }
          } catch {
            toast.error("Failed to verify payment");
          } finally {
            setIsProcessingRazorpay(false);
          }
        },
        prefill: {
          name: isWalkIn ? walkInName : `${selectedPatient?.firstName} ${selectedPatient?.lastName}`,
          email: selectedPatient?.email || "",
          contact: isWalkIn ? walkInPhone : selectedPatient?.phone || "",
        },
        theme: {
          color: "#6366F1",
        },
        modal: {
          ondismiss: () => {
            setIsProcessingRazorpay(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Razorpay error:", error);
      toast.error("Failed to initiate payment");
      setIsProcessingRazorpay(false);
    }
  };

  return (
    <>
      {/* Load Razorpay script if enabled */}
      {razorpaySettings?.enabled && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setIsRazorpayLoaded(true)}
        />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex h-[calc(100vh-4rem)] gap-4"
      >
        {/* Left Panel - Products & Search */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col gap-4 overflow-hidden"
      >
        {/* Patient Selection */}
        <Card>
          <CardContent className="p-4">
            <Tabs defaultValue="patient" onValueChange={(v) => setIsWalkIn(v === "walkin")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="patient" className="gap-2">
                  <User className="h-4 w-4" />
                  Select Patient
                </TabsTrigger>
                <TabsTrigger value="walkin" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Walk-in Customer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="patient" className="mt-0">
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPatient.patientId} • {selectedPatient.phone}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Popover open={openPatientCombobox} onOpenChange={setOpenPatientCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPatientCombobox}
                        className="w-full justify-between"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          Search patient by name, ID, or phone...
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Type to search patients..."
                          value={searchPatient}
                          onValueChange={setSearchPatient}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingPatients ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              "No patients found."
                            )}
                          </CommandEmpty>
                          {patients.length > 0 && (
                            <CommandGroup>
                              {patients.map((patient) => (
                                <CommandItem
                                  key={patient._id}
                                  value={patient._id}
                                  onSelect={() => {
                                    setSelectedPatient(patient);
                                    setSearchPatient("");
                                    setPatients([]);
                                    setOpenPatientCombobox(false);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">
                                        {patient.firstName} {patient.lastName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {patient.patientId} • {patient.phone}
                                      </p>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </TabsContent>

              <TabsContent value="walkin" className="mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      placeholder="Enter name"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      placeholder="Enter phone"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Doctor Selection */}
            <Separator className="my-4" />
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Attending Doctor
              </Label>
              {doctors.length > 0 ? (
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No doctor</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id}>
                        Dr. {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No doctors available. Create a role with &quot;Doctor&quot; in the name and assign users to it.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Search */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, medicines, services..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-10"
              />
              {isLoadingProducts && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-6 pb-6">
              {products.length === 0 && !isLoadingProducts ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-50" />
                  <p>{searchProduct ? "No products found" : "No products available"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                  {products.map((product, index) => (
                    <motion.button
                      key={product._id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addToCart(product)}
                      disabled={product.currentStock < 1}
                      className="p-3 text-left border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {product.genericName || product.sku}
                          </p>
                        </div>
                        <Badge variant={product.type === "medicine" ? "default" : "secondary"} className="text-xs shrink-0">
                          {product.type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-semibold text-primary">
                          {formatCurrency(product.sellingPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {product.currentStock} {product.unit}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right Panel - Cart */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
      <Card className="w-[400px] flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart
              {cart.length > 0 && (
                <Badge variant="secondary">{cart.length}</Badge>
              )}
            </CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent className="p-4 space-y-3">
            {cart.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              >
                <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
                <p>Cart is empty</p>
                <p className="text-xs">Search and add products</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
              {cart.map((item, index) => (
                <motion.div
                  key={item.productId}
                  initial={{ opacity: 0, x: 20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  layout
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)} × {item.quantity} = {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeFromCart(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(index, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(index, 1)}
                        disabled={item.quantity >= item.product.currentStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.discount || ""}
                        onChange={(e) => updateItemDiscount(index, parseFloat(e.target.value) || 0, item.discountType)}
                        className="w-16 h-7 text-xs"
                      />
                      <Select
                        value={item.discountType}
                        onValueChange={(v) => updateItemDiscount(index, item.discount, v as "percentage" | "fixed")}
                      >
                        <SelectTrigger className="w-12 h-7 px-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">{currency.symbol}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Tax: {item.taxRate}% = {formatCurrency(item.taxAmount)}
                    </span>
                    <span className="font-semibold">{formatCurrency(item.total)}</span>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            )}
          </CardContent>
        </ScrollArea>

        {/* Totals & Actions */}
        {cart.length > 0 && (
          <>
            <Separator />
            <CardContent className="p-4 space-y-3">
              {/* Overall Discount */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Discount:</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={overallDiscount || ""}
                  onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
                <Select
                  value={overallDiscountType}
                  onValueChange={(v) => setOverallDiscountType(v as "percentage" | "fixed")}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">{currency.symbol}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}
                {totals.taxBreakdown.map((tax) => (
                  <div key={tax.taxRate} className="flex justify-between text-muted-foreground">
                    <span>{tax.taxName}</span>
                    <span>{formatCurrency(tax.taxAmount)}</span>
                  </div>
                ))}
                {totals.roundOff !== 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Round Off</span>
                    <span>{totals.roundOff > 0 ? "+" : ""}{formatCurrency(Math.abs(totals.roundOff))}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => createInvoice(false)}
                disabled={isSubmitting}
              >
                <Clock className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                className="flex-1"
                onClick={openPaymentDialog}
                disabled={isSubmitting}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
      </motion.div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Amount to Pay</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totals.grandTotal)}</p>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className={`grid gap-2 ${
                  paymentConfig?.posPaymentMethods && paymentConfig.posPaymentMethods.length > 3
                    ? "grid-cols-4"
                    : "grid-cols-3"
                }`}
              >
                {/* Dynamic payment methods based on country */}
                {paymentConfig?.localMethods
                  ?.filter((method: LocalPaymentMethod) => paymentConfig.posPaymentMethods.includes(method.id))
                  .map((method: LocalPaymentMethod) => {
                    const IconComponent = paymentIconMap[method.icon] || CreditCard;
                    return (
                      <div key={method.id}>
                        <RadioGroupItem value={method.id} id={method.id} className="peer sr-only" />
                        <Label
                          htmlFor={method.id}
                          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <IconComponent className="mb-1 h-5 w-5" />
                          <span className="text-xs">{method.name}</span>
                        </Label>
                      </div>
                    );
                  }) || (
                  // Fallback to default methods if no payment config
                  <>
                    <div>
                      <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                      <Label
                        htmlFor="cash"
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <Banknote className="mb-1 h-5 w-5" />
                        <span className="text-xs">Cash</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="card" id="card" className="peer sr-only" />
                      <Label
                        htmlFor="card"
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <CreditCard className="mb-1 h-5 w-5" />
                        <span className="text-xs">Card</span>
                      </Label>
                    </div>
                  </>
                )}
              </RadioGroup>
            </div>

            {/* Dynamic transaction ID field based on selected payment method */}
            {(() => {
              const selectedMethod = paymentConfig?.localMethods?.find(
                (m: LocalPaymentMethod) => m.id === paymentMethod
              );
              if (selectedMethod?.requiresTransactionId) {
                return (
                  <div className="space-y-2">
                    <Label>{selectedMethod.transactionIdLabel || "Transaction ID"}</Label>
                    <Input
                      placeholder={selectedMethod.transactionIdPlaceholder || "Enter transaction ID"}
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                  </div>
                );
              }
              // Fallback for non-config payment methods
              if (!paymentConfig && (paymentMethod === "card" || paymentMethod === "upi")) {
                return (
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input
                      placeholder="Enter transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-2">
              <Label>Amount Received</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currency.symbol}
                </span>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes..."
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => createInvoice(true)} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Complete Payment
              </Button>
            </div>

            {/* Razorpay Payment Option */}
            {razorpaySettings?.enabled && isRazorpayLoaded && (
              <Button
                onClick={handleRazorpayPayment}
                disabled={isProcessingRazorpay || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isProcessingRazorpay ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Pay with Razorpay
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Invoice Created
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-6">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{createdInvoice?.invoiceNumber}</h3>
            <p className="text-2xl font-bold text-primary">{createdInvoice?.grandTotal ? formatCurrency(createdInvoice.grandTotal) : ""}</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSuccessDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                window.open(`/dashboard/billing/${createdInvoice?._id}`, "_blank");
                setShowSuccessDialog(false);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Invoice
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.open(`/dashboard/billing/${createdInvoice?._id}/print`, "_blank");
                setShowSuccessDialog(false);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </motion.div>
    </>
  );
}
