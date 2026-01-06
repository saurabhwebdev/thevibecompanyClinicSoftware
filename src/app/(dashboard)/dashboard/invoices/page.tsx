"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  Plus,
  Eye,
  Printer,
  MoreHorizontal,
  Receipt,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Filter,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_LOADING_TIME } from "@/components/ui/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/components/currency-provider";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerPhone: string;
  patientId?: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    phone: string;
  };
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  createdBy: {
    name: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Skeleton for invoices table
function InvoicesTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const loadStartTime = useRef<number>(Date.now());

  const fetchInvoices = useCallback(async () => {
    loadStartTime.current = Date.now();
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (paymentStatusFilter !== "all") {
        params.append("paymentStatus", paymentStatusFilter);
      }

      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();

      if (data.success) {
        setInvoices(data.data);
        setPagination(data.pagination);
      }
    } catch {
      toast.error("Failed to fetch invoices");
    } finally {
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      setTimeout(() => setIsLoading(false), remaining);
    }
  }, [searchQuery, statusFilter, paymentStatusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(fetchInvoices, 300);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      draft: { variant: "secondary", icon: <FileText className="h-3 w-3" /> },
      sent: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      viewed: { variant: "outline", icon: <Eye className="h-3 w-3" /> },
      paid: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      overdue: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
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

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      unpaid: { color: "bg-red-100 text-red-700", label: "Unpaid" },
      partial: { color: "bg-yellow-100 text-yellow-700", label: "Partial" },
      paid: { color: "bg-green-100 text-green-700", label: "Paid" },
      refunded: { color: "bg-purple-100 text-purple-700", label: "Refunded" },
      cancelled: { color: "bg-gray-100 text-gray-700", label: "Cancelled" },
    };

    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-700", label: status };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.paymentStatus === "paid").length,
    unpaid: invoices.filter((i) => i.paymentStatus === "unpaid").length,
    partial: invoices.filter((i) => i.paymentStatus === "partial").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.grandTotal, 0),
    paidAmount: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track all your invoices
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => router.push("/dashboard/billing")}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid gap-4 md:grid-cols-4"
      >
        {[
          { title: "Total Invoices", value: pagination.total, icon: Receipt, color: "" },
          { title: "Total Amount", value: formatCurrency(stats.totalAmount), icon: FileText, color: "" },
          { title: "Collected", value: formatCurrency(stats.paidAmount), icon: CheckCircle, color: "text-green-600", iconColor: "text-green-500" },
          { title: "Outstanding", value: formatCurrency(stats.totalAmount - stats.paidAmount), icon: AlertCircle, color: "text-red-600", iconColor: "text-red-500" },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.iconColor || "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <InvoicesTableSkeleton />
                </motion.div>
              ) : invoices.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                >
                  <Receipt className="h-12 w-12 mb-4 opacity-50" />
                  <p>No invoices found</p>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice, index) => (
                        <motion.tr
                          key={invoice._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.customerName}</p>
                              <p className="text-xs text-muted-foreground">{invoice.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(invoice.grandTotal)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(invoice.paidAmount)}
                          </TableCell>
                          <TableCell className={invoice.balanceAmount > 0 ? "text-red-600" : ""}>
                            {formatCurrency(invoice.balanceAmount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>{getPaymentStatusBadge(invoice.paymentStatus)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/billing/${invoice._id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`/dashboard/billing/${invoice._id}/print`, "_blank")}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Invoice
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {invoice.paymentStatus !== "paid" && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/billing/${invoice._id}?action=payment`)}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Record Payment
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
