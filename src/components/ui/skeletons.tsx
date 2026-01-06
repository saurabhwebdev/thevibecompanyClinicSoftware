"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

// Minimum loading time to show skeleton (2 seconds)
export const MIN_LOADING_TIME = 2000;

// Helper hook to ensure minimum loading time
export function useMinimumLoading(isLoading: boolean, minTime: number = MIN_LOADING_TIME) {
  const [showLoading, setShowLoading] = React.useState(true);
  const startTimeRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setShowLoading(true);
    } else {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minTime - elapsed);

      if (remaining > 0) {
        const timer = setTimeout(() => setShowLoading(false), remaining);
        return () => clearTimeout(timer);
      } else {
        setShowLoading(false);
      }
    }
  }, [isLoading, minTime]);

  return showLoading;
}

import React from "react";

// Stats Card Skeleton
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// Stats Cards Grid Skeleton
export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <TableRow>
      {Array.from({ length: columns }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className={cn("h-4", i === 0 ? "w-20" : i === 1 ? "w-32" : "w-16")} />
        </TableCell>
      ))}
    </TableRow>
  );
}

// Full Table Skeleton
export function TableSkeleton({
  columns = 6,
  rows = 5,
  headers,
}: {
  columns?: number;
  rows?: number;
  headers?: string[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {(headers || Array.from({ length: columns })).map((header, i) => (
            <TableHead key={i}>
              {typeof header === "string" ? header : <Skeleton className="h-4 w-20" />}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </TableBody>
    </Table>
  );
}

// Patient Card Skeleton
export function PatientCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Patient List Skeleton
export function PatientListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PatientCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Inventory/Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Invoice Row Skeleton
export function InvoiceRowSkeleton() {
  return (
    <TableRow>
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
  );
}

// Invoice List Skeleton
export function InvoiceListSkeleton({ count = 5 }: { count?: number }) {
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
        {Array.from({ length: count }).map((_, i) => (
          <InvoiceRowSkeleton key={i} />
        ))}
      </TableBody>
    </Table>
  );
}

// Appointment Card Skeleton
export function AppointmentCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Appointment List Skeleton
export function AppointmentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <AppointmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Supplier Row Skeleton
export function SupplierRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell>
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
    </TableRow>
  );
}

// Supplier List Skeleton
export function SupplierListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>GSTIN</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: count }).map((_, i) => (
          <SupplierRowSkeleton key={i} />
        ))}
      </TableBody>
    </Table>
  );
}

// Inventory Row Skeleton
export function InventoryRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell>
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
    </TableRow>
  );
}

// Inventory List Skeleton
export function InventoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-center">Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: count }).map((_, i) => (
          <InventoryRowSkeleton key={i} />
        ))}
      </TableBody>
    </Table>
  );
}

// Reports Card Skeleton
export function ReportsCardSkeleton() {
  return (
    <Card>
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
        <div className="mt-4 pt-3 border-t">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Reports Page Skeleton
export function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Health Score Card */}
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

      {/* Leading Indicators */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ReportsCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Lagging Indicators */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-40 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ReportsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Billing POS Skeleton
export function BillingPosSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Products Panel */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-9 w-64" />
            </div>
            <div className="flex gap-2 mt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4 mb-3" />
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Panel */}
      <div className="flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Skeleton className="h-10 w-full mb-4" />
            <div className="flex-1 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t space-y-2 mt-auto">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between pt-2 border-t">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="h-12 w-full mt-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Invoice Detail Skeleton
export function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <TableSkeleton columns={7} rows={3} />
        </CardContent>
      </Card>
    </div>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// Filter Bar Skeleton
export function FilterBarSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 flex-1 min-w-[200px]" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </CardContent>
    </Card>
  );
}

// Full Page Skeleton (combines header + stats + filters + table)
export function FullPageSkeleton({
  showStats = true,
  statsCount = 4,
  showFilters = true,
  tableColumns = 6,
  tableRows = 5,
}: {
  showStats?: boolean;
  statsCount?: number;
  showFilters?: boolean;
  tableColumns?: number;
  tableRows?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {showStats && <StatsCardsSkeleton count={statsCount} />}
      {showFilters && <FilterBarSkeleton />}
      <Card>
        <CardContent className="p-0">
          <TableSkeleton columns={tableColumns} rows={tableRows} />
        </CardContent>
      </Card>
    </div>
  );
}
