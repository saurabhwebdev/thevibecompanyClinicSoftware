"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Package,
  AlertTriangle,
  Clock,
  CreditCard,
  Activity,
  Target,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
  Smartphone,
  Building,
  Receipt,
  Eye,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
  Stethoscope,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_LOADING_TIME } from "@/components/ui/skeletons";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/components/currency-provider";

interface ReportData {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  laggingIndicators: {
    revenue: {
      total: number;
      growth: number;
      collected: number;
      collectionRate: number;
      invoiceCount: number;
      avgInvoiceValue: number;
    };
    patients: {
      total: number;
      newPatients: number;
      growth: number;
      demographics: {
        byGender?: { _id: string; count: number }[];
        byAge?: { _id: number | string; count: number }[];
        withInsurance?: { count: number }[];
      };
    };
    appointments: {
      total: number;
      growth: number;
      completed: number;
      completionRate: number;
      firstVisits: number;
    };
    inventory: {
      totalProducts: number;
      stockValue: number;
    };
  };
  leadingIndicators: {
    noShowRate: number;
    cancellationRate: number;
    outstandingAmount: number;
    overdueAmount: number;
    overdueInvoices: number;
    lowStockItems: number;
    expiringItems: number;
    unpaidInvoices: number;
  };
  charts: {
    revenueByDay: { _id: string; revenue: number; paid: number; count: number }[];
    paymentMethods: { _id: string; total: number; count: number }[];
    appointmentsByStatus: { _id: string; count: number }[];
    appointmentsByType: { _id: string; count: number }[];
    appointmentsByHour: { _id: number; count: number }[];
  };
  alerts: {
    lowStockProducts: { name: string; sku: string; currentStock: number; reorderLevel: number; unit: string }[];
    expiringProducts: { name: string; batchNumber: string; quantity: number; expiryDate: string; daysToExpiry: number }[];
  };
  topProducts: { _id: string; totalQuantity: number; totalRevenue: number }[];
  doctorSales: {
    doctorId: string;
    doctorName: string;
    totalRevenue: number;
    totalPaid: number;
    invoiceCount: number;
  }[];
  recentActivity: {
    invoices: { invoiceNumber: string; customerName: string; grandTotal: number; paymentStatus: string; status: string; createdAt: string }[];
    payments: { paymentNumber: string; amount: number; paymentMethod: string; paymentDate: string; invoiceId?: { invoiceNumber: string } }[];
  };
}

const periodOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
];

// Reports Page Skeleton
function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Health Score Card Skeleton */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leading Indicators Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-7 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Lagging Indicators Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const loadStartTime = useRef<number>(Date.now());

  const fetchReports = useCallback(async () => {
    loadStartTime.current = Date.now();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${period}&type=overview`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        toast.error("Failed to load reports");
      }
    } catch {
      toast.error("Failed to load reports");
    } finally {
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      setTimeout(() => setIsLoading(false), remaining);
    }
  }, [period]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatCurrency = (value: number) => {
    return formatCurrencyHook(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-IN").format(value);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (growth < 0) return <ArrowDownRight className="h-4 w-4" />;
    return null;
  };

  const getRiskLevel = (value: number, thresholds: { low: number; medium: number }) => {
    if (value >= thresholds.medium) return { level: "high", color: "destructive" };
    if (value >= thresholds.low) return { level: "medium", color: "warning" };
    return { level: "low", color: "default" };
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      paid: { variant: "default", label: "Paid" },
      partial: { variant: "secondary", label: "Partial" },
      unpaid: { variant: "outline", label: "Unpaid" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const c = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  // Calculate max revenue for chart scaling
  const maxRevenue = data?.charts.revenueByDay.reduce((max, d) => Math.max(max, d.revenue), 0) || 0;

  // Age group labels
  const ageLabels: Record<string, string> = {
    "0": "0-17",
    "18": "18-29",
    "30": "30-44",
    "45": "45-59",
    "60": "60+",
    "Unknown": "Unknown",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Business Intelligence</h2>
          <p className="text-muted-foreground">
            Real-time insights to drive better decisions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ReportsPageSkeleton />
          </motion.div>
        ) : !data ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-96"
          >
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Unable to load reports</p>
              <Button onClick={fetchReports} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Health Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Business Health Score</h3>
                <p className="text-sm text-muted-foreground">
                  Based on {data.period.days} days of operational data
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">
                {Math.round(
                  (data.laggingIndicators.revenue.collectionRate * 0.3 +
                    data.laggingIndicators.appointments.completionRate * 0.3 +
                    (100 - data.leadingIndicators.noShowRate) * 0.2 +
                    (100 - Math.min(data.leadingIndicators.lowStockItems * 5, 100)) * 0.2)
                )}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {data.laggingIndicators.revenue.collectionRate >= 80 && data.leadingIndicators.noShowRate < 10
                  ? "Excellent performance"
                  : data.laggingIndicators.revenue.collectionRate >= 60
                  ? "Good, room for improvement"
                  : "Needs attention"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
            </motion.div>

      {/* Leading Indicators - Early Warning System */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">Leading Indicators</h3>
          <Badge variant="outline" className="text-xs">Early Warning Signals</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Outstanding Payments Risk */}
          <Card className={data.leadingIndicators.overdueAmount > 0 ? "border-red-200 bg-red-50/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    data.leadingIndicators.overdueAmount > 0 ? "bg-red-100" : "bg-amber-100"
                  }`}>
                    <AlertTriangle className={`h-4 w-4 ${
                      data.leadingIndicators.overdueAmount > 0 ? "text-red-600" : "text-amber-600"
                    }`} />
                  </div>
                  <span className="text-sm font-medium">Payment Risk</span>
                </div>
                {data.leadingIndicators.overdueInvoices > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {data.leadingIndicators.overdueInvoices} overdue
                  </Badge>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">
                  {formatCurrency(data.leadingIndicators.outstandingAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Outstanding from {data.leadingIndicators.unpaidInvoices} invoices
                </p>
                {data.leadingIndicators.overdueAmount > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {formatCurrency(data.leadingIndicators.overdueAmount)} past due date
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* No-Show Rate */}
          <Card className={data.leadingIndicators.noShowRate > 10 ? "border-amber-200 bg-amber-50/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    data.leadingIndicators.noShowRate > 10 ? "bg-amber-100" : "bg-green-100"
                  }`}>
                    <XCircle className={`h-4 w-4 ${
                      data.leadingIndicators.noShowRate > 10 ? "text-amber-600" : "text-green-600"
                    }`} />
                  </div>
                  <span className="text-sm font-medium">No-Show Rate</span>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">
                  {data.leadingIndicators.noShowRate.toFixed(1)}%
                </p>
                <Progress
                  value={data.leadingIndicators.noShowRate}
                  className="mt-2 h-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.leadingIndicators.noShowRate <= 5
                    ? "Excellent patient attendance"
                    : data.leadingIndicators.noShowRate <= 10
                    ? "Within acceptable range"
                    : "Consider reminder system"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className={data.leadingIndicators.lowStockItems > 5 ? "border-orange-200 bg-orange-50/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    data.leadingIndicators.lowStockItems > 5 ? "bg-orange-100" : "bg-blue-100"
                  }`}>
                    <Package className={`h-4 w-4 ${
                      data.leadingIndicators.lowStockItems > 5 ? "text-orange-600" : "text-blue-600"
                    }`} />
                  </div>
                  <span className="text-sm font-medium">Stock Alerts</span>
                </div>
                {data.leadingIndicators.lowStockItems > 0 && (
                  <Badge variant={data.leadingIndicators.lowStockItems > 5 ? "destructive" : "secondary"} className="text-xs">
                    {data.leadingIndicators.lowStockItems} low
                  </Badge>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">
                  {data.leadingIndicators.lowStockItems + data.leadingIndicators.expiringItems}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Items need attention
                </p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-orange-600">{data.leadingIndicators.lowStockItems} low stock</span>
                  <span className="text-red-600">{data.leadingIndicators.expiringItems} expiring</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium">Cancellation Rate</span>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">
                  {data.leadingIndicators.cancellationRate.toFixed(1)}%
                </p>
                <Progress
                  value={data.leadingIndicators.cancellationRate}
                  className="mt-2 h-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.leadingIndicators.cancellationRate <= 5
                    ? "Very low cancellations"
                    : data.leadingIndicators.cancellationRate <= 15
                    ? "Normal range"
                    : "High - review booking process"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lagging Indicators - Performance Outcomes */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">Lagging Indicators</h3>
          <Badge variant="outline" className="text-xs">Performance Outcomes</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Revenue */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(data.laggingIndicators.revenue.total)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className={`flex items-center gap-1 text-sm ${getGrowthColor(data.laggingIndicators.revenue.growth)}`}>
                  {getGrowthIcon(data.laggingIndicators.revenue.growth)}
                  <span>{Math.abs(data.laggingIndicators.revenue.growth).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">vs previous period</span>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Collected</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(data.laggingIndicators.revenue.collected)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Collection Rate</p>
                  <p className="font-medium">{data.laggingIndicators.revenue.collectionRate.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patients */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Patients</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(data.laggingIndicators.patients.total)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    +{data.laggingIndicators.patients.newPatients} new
                  </Badge>
                  <span className={`flex items-center gap-1 text-sm ${getGrowthColor(data.laggingIndicators.patients.growth)}`}>
                    {getGrowthIcon(data.laggingIndicators.patients.growth)}
                    {Math.abs(data.laggingIndicators.patients.growth).toFixed(0)}%
                  </span>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex gap-2 text-xs">
                {data.laggingIndicators.patients.demographics.byGender?.map((g) => (
                  <Badge key={g._id} variant="outline">
                    {g._id}: {g.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Appointments</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(data.laggingIndicators.appointments.total)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className={`flex items-center gap-1 text-sm ${getGrowthColor(data.laggingIndicators.appointments.growth)}`}>
                  {getGrowthIcon(data.laggingIndicators.appointments.growth)}
                  <span>{Math.abs(data.laggingIndicators.appointments.growth).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">vs previous period</span>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Completed</p>
                  <p className="font-medium text-green-600">
                    {data.laggingIndicators.appointments.completed}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">First Visits</p>
                  <p className="font-medium">{data.laggingIndicators.appointments.firstVisits}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Value */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(data.laggingIndicators.inventory.stockValue)}
                    </p>
                  </div>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Products</p>
                  <p className="font-medium">{data.laggingIndicators.inventory.totalProducts}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Avg per Item</p>
                  <p className="font-medium">
                    {formatCurrency(
                      data.laggingIndicators.inventory.totalProducts > 0
                        ? data.laggingIndicators.inventory.stockValue / data.laggingIndicators.inventory.totalProducts
                        : 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Insights */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue" className="gap-2">
            <LineChart className="h-4 w-4" />
            Revenue Trend
          </TabsTrigger>
          <TabsTrigger value="doctors" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Doctor Sales
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <PieChart className="h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Revenue Trend */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {data.charts.revenueByDay.length > 0 ? (
                  <div className="flex items-end justify-between gap-1 h-full">
                    {data.charts.revenueByDay.map((day, i) => {
                      const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={day._id} className="flex-1 flex flex-col items-center group">
                          <div className="w-full relative" style={{ height: "200px" }}>
                            <div
                              className="absolute bottom-0 w-full bg-primary/80 rounded-t transition-all group-hover:bg-primary"
                              style={{ height: `${height}%`, minHeight: day.revenue > 0 ? "4px" : "0" }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 -rotate-45 origin-left">
                            {format(new Date(day._id), "MMM d")}
                          </p>
                          <div className="absolute hidden group-hover:block bg-popover border shadow-lg rounded-lg p-2 text-xs -translate-y-full -mt-2">
                            <p className="font-medium">{format(new Date(day._id), "MMM d, yyyy")}</p>
                            <p>Revenue: {formatCurrency(day.revenue)}</p>
                            <p>Invoices: {day.count}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No revenue data for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctor Sales */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Doctor Sales Performance
              </CardTitle>
              <CardDescription>Revenue breakdown by attending doctor</CardDescription>
            </CardHeader>
            <CardContent>
              {data.doctorSales && data.doctorSales.length > 0 ? (
                <div className="space-y-4">
                  {(() => {
                    const maxRevenue = data.doctorSales.reduce((max, d) => Math.max(max, d.totalRevenue), 0);
                    return data.doctorSales.map((doctor, index) => {
                      const percentage = maxRevenue > 0 ? (doctor.totalRevenue / maxRevenue) * 100 : 0;
                      const collectionRate = doctor.totalRevenue > 0
                        ? (doctor.totalPaid / doctor.totalRevenue) * 100
                        : 0;
                      return (
                        <div key={doctor.doctorId} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold">Dr. {doctor.doctorName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doctor.invoiceCount} invoices
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                {formatCurrency(doctor.totalRevenue)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Total Revenue
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Progress value={percentage} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Collected</span>
                              <span className="text-green-600 font-medium">
                                {formatCurrency(doctor.totalPaid)} ({collectionRate.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Outstanding</span>
                              <span className={doctor.totalRevenue - doctor.totalPaid > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                                {formatCurrency(doctor.totalRevenue - doctor.totalPaid)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No doctor sales data for this period</p>
                  <p className="text-sm mt-1">Assign doctors to invoices to see sales by doctor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods */}
        <TabsContent value="payments">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Distribution</CardTitle>
                <CardDescription>How patients prefer to pay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.charts.paymentMethods.length > 0 ? (
                    data.charts.paymentMethods.map((method) => {
                      const total = data.charts.paymentMethods.reduce((sum, m) => sum + m.total, 0);
                      const percentage = total > 0 ? (method.total / total) * 100 : 0;
                      return (
                        <div key={method._id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(method._id)}
                              <span className="capitalize font-medium">{method._id || "Other"}</span>
                            </div>
                            <span>{formatCurrency(method.total)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No payment data for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing items by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topProducts.length > 0 ? (
                    data.topProducts.slice(0, 5).map((product, i) => (
                      <div key={product._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</span>
                          <div>
                            <p className="font-medium text-sm">{product._id}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.totalQuantity} units sold
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-sm">{formatCurrency(product.totalRevenue)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No sales data for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appointments */}
        <TabsContent value="appointments">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appointments by Status</CardTitle>
                <CardDescription>Distribution of appointment outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.charts.appointmentsByStatus.map((status) => {
                    const total = data.laggingIndicators.appointments.total;
                    const percentage = total > 0 ? (status.count / total) * 100 : 0;
                    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
                      completed: { color: "bg-green-500", icon: <CheckCircle className="h-4 w-4 text-green-600" /> },
                      scheduled: { color: "bg-blue-500", icon: <Clock className="h-4 w-4 text-blue-600" /> },
                      confirmed: { color: "bg-purple-500", icon: <CheckCircle className="h-4 w-4 text-purple-600" /> },
                      cancelled: { color: "bg-red-500", icon: <XCircle className="h-4 w-4 text-red-600" /> },
                      "no-show": { color: "bg-amber-500", icon: <AlertCircle className="h-4 w-4 text-amber-600" /> },
                    };
                    const config = statusConfig[status._id] || { color: "bg-gray-500", icon: null };
                    return (
                      <div key={status._id} className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${config.color}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">{status._id}</span>
                            <span className="text-muted-foreground">{status.count}</span>
                          </div>
                          <Progress value={percentage} className="h-1.5 mt-1" />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>When most appointments are scheduled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.charts.appointmentsByHour.length > 0 ? (
                    (() => {
                      const maxHour = data.charts.appointmentsByHour.reduce((max, h) => Math.max(max, h.count), 0);
                      return data.charts.appointmentsByHour.map((hour) => {
                        const percentage = maxHour > 0 ? (hour.count / maxHour) * 100 : 0;
                        const isPeak = percentage >= 80;
                        return (
                          <div key={hour._id} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-14">
                              {hour._id.toString().padStart(2, "0")}:00
                            </span>
                            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                              <div
                                className={`h-full ${isPeak ? "bg-primary" : "bg-primary/50"} transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8">{hour.count}</span>
                            {isPeak && (
                              <Badge variant="secondary" className="text-xs">Peak</Badge>
                            )}
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No appointment data for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  Low Stock Items
                </CardTitle>
                <CardDescription>Products that need reordering</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {data.alerts.lowStockProducts.length > 0 ? (
                    <div className="space-y-3">
                      {data.alerts.lowStockProducts.map((product) => (
                        <div
                          key={product.sku}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-orange-600">
                              {product.currentStock} {product.unit}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Reorder at {product.reorderLevel}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                      <p>All stock levels healthy</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-500" />
                  Expiring Items
                </CardTitle>
                <CardDescription>Products expiring within 90 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {data.alerts.expiringProducts.length > 0 ? (
                    <div className="space-y-3">
                      {data.alerts.expiringProducts.map((product, i) => (
                        <div
                          key={`${product.batchNumber}-${i}`}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Batch: {product.batchNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={product.daysToExpiry <= 30 ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {product.daysToExpiry} days
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Qty: {product.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                      <p>No items expiring soon</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.invoices.map((invoice) => (
                <div
                  key={invoice.invoiceNumber}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{invoice.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(invoice.grandTotal)}</p>
                    <div className="mt-1">{getStatusBadge(invoice.paymentStatus)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.payments.map((payment) => (
                <div
                  key={payment.paymentNumber}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      {getPaymentMethodIcon(payment.paymentMethod)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{payment.paymentNumber}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {payment.paymentMethod} • {payment.invoiceId?.invoiceNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-green-600">
                      +{formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(payment.paymentDate), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
        </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
