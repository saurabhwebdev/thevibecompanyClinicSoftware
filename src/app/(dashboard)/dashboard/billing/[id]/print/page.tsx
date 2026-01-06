"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
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
    patientId: string;
  };
  doctorId?: {
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
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  termsAndConditions?: string;
  createdAt: string;
}

interface UPISettings {
  enabled: boolean;
  vpa: string;
  merchantName: string;
  merchantCode?: string;
  showQROnInvoice: boolean;
}

interface TaxConfig {
  legalName: string;
  tradeName?: string;
  registrationNumber: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  email: string;
  phone: string;
  invoiceSettings?: {
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      routingCode: string;
      branchName?: string;
    };
  };
  upiSettings?: UPISettings;
}

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { formatCurrency, currency, numberToWords } = useCurrency();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upiQrCode, setUpiQrCode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [invoiceRes, taxRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch("/api/tax-config"),
      ]);

      const invoiceData = await invoiceRes.json();
      const taxData = await taxRes.json();

      if (invoiceData.success) {
        setInvoice(invoiceData.data);
      }
      if (taxData.success) {
        setTaxConfig(taxData.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate UPI QR code when invoice and taxConfig are available
  useEffect(() => {
    const generateUpiQr = async () => {
      if (!invoice || !taxConfig?.upiSettings?.enabled || !taxConfig.upiSettings.showQROnInvoice) {
        return;
      }

      const upi = taxConfig.upiSettings;
      if (!upi.vpa) return;

      // Generate UPI payment URL
      // Format: upi://pay?pa=VPA&pn=PayeeName&am=Amount&cu=INR&tn=TransactionNote
      const amount = invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal;
      const upiUrl = new URL("upi://pay");
      upiUrl.searchParams.set("pa", upi.vpa);
      upiUrl.searchParams.set("pn", upi.merchantName || taxConfig.tradeName || taxConfig.legalName);
      upiUrl.searchParams.set("am", amount.toFixed(2));
      upiUrl.searchParams.set("cu", currency.code);
      upiUrl.searchParams.set("tn", `Payment for Invoice ${invoice.invoiceNumber}`);
      if (upi.merchantCode) {
        upiUrl.searchParams.set("mc", upi.merchantCode);
      }

      try {
        const qrDataUrl = await QRCode.toDataURL(upiUrl.toString(), {
          width: 150,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setUpiQrCode(qrDataUrl);
      } catch (error) {
        console.error("Failed to generate UPI QR code:", error);
      }
    };

    generateUpiQr();
  }, [invoice, taxConfig, currency.code]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Invoice not found</p>
      </div>
    );
  }

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden flex justify-end gap-2 p-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-0 print:max-w-none print-invoice">
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            /* Hide everything first */
            body * {
              visibility: hidden;
            }
            /* Show only the invoice content */
            .print-invoice,
            .print-invoice * {
              visibility: visible !important;
            }
            /* Position the invoice at the top left */
            .print-invoice {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white !important;
              color: black !important;
            }
            /* Hide header, sidebar, and any navigation */
            header, nav, aside, .print\\:hidden {
              display: none !important;
              visibility: hidden !important;
            }
          }
          .print-invoice {
            background: white !important;
            color: #000 !important;
          }
          .print-invoice * {
            color: inherit;
          }
        `}</style>

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {taxConfig?.tradeName || taxConfig?.legalName || "Clinic Name"}
              </h1>
              {taxConfig?.legalName && taxConfig.tradeName && (
                <p className="text-sm text-gray-600">{taxConfig.legalName}</p>
              )}
              {taxConfig?.address && (
                <div className="text-sm text-gray-600 mt-1">
                  <p>{taxConfig.address.line1}</p>
                  {taxConfig.address.line2 && <p>{taxConfig.address.line2}</p>}
                  <p>
                    {taxConfig.address.city}, {taxConfig.address.state} - {taxConfig.address.postalCode}
                  </p>
                </div>
              )}
              {taxConfig && (
                <p className="text-sm text-gray-700 mt-1">
                  {taxConfig.phone} | {taxConfig.email}
                </p>
              )}
              {taxConfig?.registrationNumber && (
                <p className="text-sm font-medium text-gray-900 mt-1">GSTIN: {taxConfig.registrationNumber}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900">TAX INVOICE</h2>
              <p className="text-lg font-semibold text-gray-900">{invoice.invoiceNumber}</p>
              <p className="text-sm text-gray-600 mt-2">
                Date: {format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}
              </p>
              <p className="text-sm text-gray-600">
                Due: {format(new Date(invoice.dueDate), "dd/MM/yyyy")}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To and Doctor Info */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 p-4 bg-gray-100 rounded-lg border border-gray-300">
            <h3 className="font-semibold mb-2 text-gray-900">Bill To:</h3>
            <p className="font-medium text-gray-900">{invoice.customerName}</p>
            {invoice.patientId && (
              <p className="text-sm text-gray-600">Patient ID: {invoice.patientId.patientId}</p>
            )}
            <p className="text-sm text-gray-700">{invoice.customerPhone}</p>
            {invoice.customerEmail && <p className="text-sm text-gray-700">{invoice.customerEmail}</p>}
            {invoice.customerAddress?.line1 && (
              <p className="text-sm text-gray-700">
                {invoice.customerAddress.line1}
                {invoice.customerAddress.city && `, ${invoice.customerAddress.city}`}
                {invoice.customerAddress.state && `, ${invoice.customerAddress.state}`}
                {invoice.customerAddress.postalCode && ` - ${invoice.customerAddress.postalCode}`}
              </p>
            )}
          </div>
          {invoice.doctorId && (
            <div className="w-64 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-2 text-gray-900">Attending Doctor:</h3>
              <p className="font-medium text-gray-900">Dr. {invoice.doctorId.name}</p>
              {invoice.doctorId.email && (
                <p className="text-sm text-gray-600">{invoice.doctorId.email}</p>
              )}
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr style={{ backgroundColor: "#1f2937", color: "#ffffff" }}>
              <th className="border border-gray-400 p-2 text-left text-white">#</th>
              <th className="border border-gray-400 p-2 text-left text-white">Description</th>
              <th className="border border-gray-400 p-2 text-center text-white">HSN/SAC</th>
              <th className="border border-gray-400 p-2 text-right text-white">Qty</th>
              <th className="border border-gray-400 p-2 text-right text-white">Rate</th>
              <th className="border border-gray-400 p-2 text-right text-white">Discount</th>
              <th className="border border-gray-400 p-2 text-right text-white">Tax</th>
              <th className="border border-gray-400 p-2 text-right text-white">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => {
              const itemSubtotal = item.quantity * item.unitPrice;
              const discountAmount = item.discount > 0
                ? (item.discountType === "percentage"
                  ? (itemSubtotal * item.discount) / 100
                  : item.discount)
                : 0;

              return (
                <tr key={item._id} className="border-b border-gray-300">
                  <td className="border border-gray-300 p-2 text-gray-900">{index + 1}</td>
                  <td className="border border-gray-300 p-2">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-600">{item.description}</p>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2 text-center text-sm text-gray-700">
                    {item.hsnCode || item.sacCode || "-"}
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-gray-900">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-gray-900">{formatCurrency(item.unitPrice)}</td>
                  <td className="border border-gray-300 p-2 text-right text-gray-700">
                    {item.discount > 0 ? (
                      <>
                        <span className="text-xs">{item.discount}{item.discountType === "percentage" ? "%" : currency.symbol}</span>
                        <br />
                        <span className="text-xs text-green-700">-{formatCurrency(discountAmount)}</span>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-gray-700">
                    <span className="text-xs">{item.taxRate}%</span>
                    <br />
                    <span className="text-xs">{formatCurrency(item.taxAmount)}</span>
                  </td>
                  <td className="border border-gray-300 p-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-between mb-6">
          {/* Amount in Words */}
          <div className="flex-1 pr-8">
            <p className="text-sm text-gray-900">
              <span className="font-medium">Amount in Words:</span>
              <br />
              <span className="italic text-gray-700">{numberToWords(invoice.grandTotal)}</span>
            </p>

            {/* Bank Details */}
            {taxConfig?.invoiceSettings?.bankDetails && (
              <div className="mt-4 text-sm text-gray-900">
                <p className="font-medium mb-1">Bank Details:</p>
                <p className="text-gray-700">Bank: {taxConfig.invoiceSettings.bankDetails.bankName}</p>
                <p className="text-gray-700">A/C No: {taxConfig.invoiceSettings.bankDetails.accountNumber}</p>
                <p className="text-gray-700">IFSC: {taxConfig.invoiceSettings.bankDetails.routingCode}</p>
                {taxConfig.invoiceSettings.bankDetails.branchName && (
                  <p className="text-gray-700">Branch: {taxConfig.invoiceSettings.bankDetails.branchName}</p>
                )}
              </div>
            )}

            {/* UPI QR Code */}
            {upiQrCode && invoice.balanceAmount > 0 && (
              <div className="mt-4 flex flex-col items-start">
                <p className="font-medium text-sm text-gray-900 mb-2">Pay via UPI:</p>
                <div className="border border-gray-300 p-2 bg-white rounded">
                  <img src={upiQrCode} alt="UPI QR Code" className="w-24 h-24" />
                </div>
                <p className="text-xs text-gray-600 mt-1">{taxConfig?.upiSettings?.vpa}</p>
                <p className="text-xs text-gray-700 font-medium">
                  Amount: {formatCurrency(invoice.balanceAmount)}
                </p>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="w-72">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-900">Subtotal</td>
                  <td className="py-1 text-right text-gray-900">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discountAmount > 0 && (
                  <tr className="text-green-700">
                    <td className="py-1">Discount</td>
                    <td className="py-1 text-right">-{formatCurrency(invoice.discountAmount)}</td>
                  </tr>
                )}
                {invoice.taxBreakdown.map((tax, idx) => (
                  <tr key={idx}>
                    <td className="py-1 text-gray-700">{tax.taxName}</td>
                    <td className="py-1 text-right text-gray-700">{formatCurrency(tax.taxAmount)}</td>
                  </tr>
                ))}
                {invoice.roundOff !== 0 && (
                  <tr>
                    <td className="py-1 text-gray-700">Round Off</td>
                    <td className="py-1 text-right text-gray-700">
                      {invoice.roundOff > 0 ? "+" : ""}{formatCurrency(invoice.roundOff)}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-800 font-bold text-base">
                  <td className="py-2 text-gray-900">Grand Total</td>
                  <td className="py-2 text-right text-gray-900">{formatCurrency(invoice.grandTotal)}</td>
                </tr>
                {invoice.paidAmount > 0 && (
                  <>
                    <tr className="text-green-700">
                      <td className="py-1">Paid</td>
                      <td className="py-1 text-right">{formatCurrency(invoice.paidAmount)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-1 text-gray-900">Balance Due</td>
                      <td className="py-1 text-right text-red-700">{formatCurrency(invoice.balanceAmount)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tax Breakdown */}
        {invoice.taxBreakdown.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-sm text-gray-900">Tax Summary</h4>
            <table className="w-full text-sm border border-gray-400">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 p-2 text-left text-gray-900">Tax Type</th>
                  <th className="border border-gray-400 p-2 text-right text-gray-900">Taxable Amount</th>
                  <th className="border border-gray-400 p-2 text-right text-gray-900">CGST</th>
                  <th className="border border-gray-400 p-2 text-right text-gray-900">SGST</th>
                  <th className="border border-gray-400 p-2 text-right text-gray-900">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {invoice.taxBreakdown.map((tax, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-2 text-gray-900">{tax.taxName}</td>
                    <td className="border border-gray-300 p-2 text-right text-gray-900">{formatCurrency(tax.taxableAmount)}</td>
                    <td className="border border-gray-300 p-2 text-right text-gray-900">{formatCurrency(tax.taxAmount / 2)}</td>
                    <td className="border border-gray-300 p-2 text-right text-gray-900">{formatCurrency(tax.taxAmount / 2)}</td>
                    <td className="border border-gray-300 p-2 text-right text-gray-900">{formatCurrency(tax.taxAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes & Terms */}
        {(invoice.notes || invoice.termsAndConditions) && (
          <div className="text-sm border-t border-gray-400 pt-4">
            {invoice.notes && (
              <div className="mb-2">
                <span className="font-medium text-gray-900">Notes: </span>
                <span className="text-gray-700">{invoice.notes}</span>
              </div>
            )}
            {invoice.termsAndConditions && (
              <div>
                <span className="font-medium text-gray-900">Terms & Conditions: </span>
                <span className="text-gray-700 whitespace-pre-wrap">{invoice.termsAndConditions}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-400 text-center text-sm text-gray-700">
          <p>Thank you for your business!</p>
          <p className="mt-1">This is a computer generated invoice.</p>
        </div>
      </div>
    </>
  );
}
