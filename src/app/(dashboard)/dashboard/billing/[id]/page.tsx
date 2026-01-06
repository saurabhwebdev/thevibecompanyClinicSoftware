"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import Script from "next/script";
import {
  ArrowLeft,
  Printer,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Calendar,
  Hash,
  Download,
  Zap,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCurrency } from "@/components/currency-provider";

interface InvoiceItem {
  _id: string;
  name: string;
  description?: string;
  type: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType: string;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  hsnCode?: string;
  sacCode?: string;
}

interface Payment {
  _id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  status: string;
  createdBy: {
    name: string;
  };
}

interface RazorpaySettings {
  enabled: boolean;
  keyId: string;
  sandbox: boolean;
}

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

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  patientId?: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    phone: string;
    email?: string;
  };
  doctorId?: {
    _id: string;
    name: string;
    email: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  totalTax: number;
  totalAmount: number;
  roundOff: number;
  grandTotal: number;
  taxBreakdown: {
    taxName: string;
    taxRate: number;
    taxableAmount: number;
    taxAmount: number;
  }[];
  paymentStatus: string;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod?: string;
  status: string;
  notes?: string;
  termsAndConditions?: string;
  payments: Payment[];
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatCurrency, currency } = useCurrency();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Razorpay
  const [razorpaySettings, setRazorpaySettings] = useState<RazorpaySettings | null>(null);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);
  const [businessName, setBusinessName] = useState("");

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();

      if (data.success) {
        setInvoice(data.data);
        setPaymentAmount(data.data.balanceAmount);
      } else {
        toast.error("Invoice not found");
        router.push("/dashboard/invoices");
      }
    } catch {
      toast.error("Failed to fetch invoice");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    if (searchParams.get("action") === "payment" && invoice?.balanceAmount && invoice.balanceAmount > 0) {
      setShowPaymentDialog(true);
    }
  }, [searchParams, invoice]);

  // Fetch payment settings on mount
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const [paymentRes, taxRes] = await Promise.all([
          fetch("/api/payment-settings"),
          fetch("/api/tax-config"),
        ]);

        const paymentData = await paymentRes.json();
        const taxData = await taxRes.json();

        if (paymentData.success && paymentData.data?.razorpaySettings?.enabled) {
          setRazorpaySettings({
            enabled: true,
            keyId: paymentData.data.razorpaySettings.keyId,
            sandbox: paymentData.data.razorpaySettings.sandbox,
          });
        }

        if (taxData.success && taxData.data) {
          setBusinessName(taxData.data.tradeName || taxData.data.legalName || "Clinic");
        }
      } catch (error) {
        console.error("Failed to fetch payment settings:", error);
      }
    };

    fetchPaymentSettings();
  }, []);

  const handlePayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (invoice && paymentAmount > invoice.balanceAmount) {
      toast.error("Amount cannot exceed balance");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: id,
          amount: paymentAmount,
          paymentMethod,
          transactionId,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Payment recorded successfully");
        setShowPaymentDialog(false);
        fetchInvoice();
        // Reset form
        setTransactionId("");
        setPaymentNotes("");
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    if (!razorpaySettings?.enabled || !isRazorpayLoaded || !invoice) {
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
          amount: paymentAmount,
          currency: "INR",
          receipt: invoice.invoiceNumber,
          notes: {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
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
        description: `Payment for ${invoice.invoiceNumber}`,
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
              // Record the payment
              const paymentRes = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  invoiceId: id,
                  amount: paymentAmount,
                  paymentMethod: "razorpay",
                  transactionId: response.razorpay_payment_id,
                  notes: `Razorpay Order: ${response.razorpay_order_id}`,
                }),
              });

              const paymentData = await paymentRes.json();

              if (paymentData.success) {
                toast.success("Payment successful!");
                setShowPaymentDialog(false);
                fetchInvoice();
                setTransactionId("");
                setPaymentNotes("");
              } else {
                toast.error(paymentData.error || "Failed to record payment");
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
          name: invoice.customerName,
          email: invoice.customerEmail || "",
          contact: invoice.customerPhone || "",
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      draft: { variant: "secondary", icon: <FileText className="h-3 w-3" /> },
      sent: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      paid: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || { variant: "secondary" as const, icon: null };

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, React.ReactNode> = {
      cash: <Banknote className="h-4 w-4" />,
      card: <CreditCard className="h-4 w-4" />,
      upi: <Smartphone className="h-4 w-4" />,
      netbanking: <Building className="h-4 w-4" />,
    };
    return icons[method] || <Receipt className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <>
      {/* Load Razorpay script if enabled */}
      {razorpaySettings?.enabled && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setIsRazorpayLoaded(true)}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {invoice.invoiceNumber}
              {getStatusBadge(invoice.status)}
            </h2>
            <p className="text-sm text-muted-foreground">
              Created on {format(new Date(invoice.createdAt), "dd MMM yyyy, hh:mm a")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.balanceAmount > 0 && (
            <Button onClick={() => setShowPaymentDialog(true)}>
              <Receipt className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
          <Button variant="outline" onClick={() => window.open(`/dashboard/billing/${id}/print`, "_blank")}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column - Invoice Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer & Invoice Info */}
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Bill To
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-lg">{invoice.customerName}</p>
                    {invoice.patientId && (
                      <p className="text-muted-foreground">
                        Patient ID: {invoice.patientId.patientId}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {invoice.customerPhone}
                    </p>
                    {invoice.customerEmail && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {invoice.customerEmail}
                      </p>
                    )}
                    {invoice.customerAddress?.line1 && (
                      <p className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 mt-1" />
                        <span>
                          {invoice.customerAddress.line1}
                          {invoice.customerAddress.city && `, ${invoice.customerAddress.city}`}
                          {invoice.customerAddress.state && `, ${invoice.customerAddress.state}`}
                          {invoice.customerAddress.postalCode && ` - ${invoice.customerAddress.postalCode}`}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Invoice Info */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Invoice Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice Number</span>
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice Date</span>
                      <span>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <span>{format(new Date(invoice.dueDate), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created By</span>
                      <span>{invoice.createdBy.name}</span>
                    </div>
                    {invoice.doctorId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          Doctor
                        </span>
                        <span>Dr. {invoice.doctorId.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => {
                    const itemSubtotal = item.quantity * item.unitPrice;
                    const discountAmount = item.discount > 0
                      ? (item.discountType === "percentage"
                        ? (itemSubtotal * item.discount) / 100
                        : item.discount)
                      : 0;

                    return (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                            {(item.hsnCode || item.sacCode) && (
                              <p className="text-xs text-muted-foreground">
                                {item.hsnCode ? `HSN: ${item.hsnCode}` : `SAC: ${item.sacCode}`}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">
                          {item.discount > 0 ? (
                            <div className="text-green-600">
                              <span>{item.discount}{item.discountType === "percentage" ? "%" : currency.symbol}</span>
                              <br />
                              <span className="text-xs">-{formatCurrency(discountAmount)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-muted-foreground">{item.taxRate}%</span>
                          <br />
                          <span className="text-xs">{formatCurrency(item.taxAmount)}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="p-6 border-t">
                <div className="max-w-xs ml-auto space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {invoice.taxBreakdown.map((tax, idx) => (
                    <div key={idx} className="flex justify-between text-muted-foreground">
                      <span>{tax.taxName}</span>
                      <span>{formatCurrency(tax.taxAmount)}</span>
                    </div>
                  ))}
                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Round Off</span>
                      <span>{invoice.roundOff > 0 ? "+" : "-"}{formatCurrency(Math.abs(invoice.roundOff))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Grand Total</span>
                    <span className="text-primary">{formatCurrency(invoice.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(invoice.notes || invoice.termsAndConditions) && (
            <Card>
              <CardContent className="p-6 space-y-4">
                {invoice.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.termsAndConditions && (
                  <div>
                    <h4 className="font-medium mb-2">Terms & Conditions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.termsAndConditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Payment Summary */}
        <div className="space-y-4">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Amount</span>
                  <span className="font-medium">{formatCurrency(invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid Amount</span>
                  <span className="font-medium">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Balance Due</span>
                  <span className={invoice.balanceAmount > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(invoice.balanceAmount)}
                  </span>
                </div>
              </div>

              {invoice.balanceAmount > 0 && (
                <Button className="w-full" onClick={() => setShowPaymentDialog(true)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment._id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{payment.paymentNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.paymentDate), "dd MMM yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {payment.paymentMethod}
                          {payment.transactionId && ` • ${payment.transactionId}`}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Balance Due</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.balanceAmount)}</p>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-2">
                {[
                  { value: "cash", label: "Cash", icon: Banknote },
                  { value: "card", label: "Card", icon: CreditCard },
                  { value: "upi", label: "UPI", icon: Smartphone },
                  { value: "netbanking", label: "Net Banking", icon: Building },
                ].map((method) => (
                  <div key={method.value}>
                    <RadioGroupItem value={method.value} id={method.value} className="peer sr-only" />
                    <Label
                      htmlFor={method.value}
                      className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <method.icon className="h-4 w-4" />
                      <span className="text-sm">{method.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="pl-10"
                  max={invoice.balanceAmount}
                />
              </div>
            </div>

            {paymentMethod !== "cash" && (
              <div className="space-y-2">
                <Label>Transaction ID</Label>
                <Input
                  placeholder="Enter transaction/reference ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePayment} disabled={isSubmittingPayment} className="flex-1">
                {isSubmittingPayment ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Record Payment
              </Button>
            </div>

            {/* Razorpay Payment Option */}
            {razorpaySettings?.enabled && isRazorpayLoaded && (
              <Button
                onClick={handleRazorpayPayment}
                disabled={isProcessingRazorpay || isSubmittingPayment}
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
      </div>
    </>
  );
}
