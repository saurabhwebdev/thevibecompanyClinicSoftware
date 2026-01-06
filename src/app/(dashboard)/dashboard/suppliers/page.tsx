"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Truck,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_LOADING_TIME } from "@/components/ui/skeletons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/components/currency-provider";

interface Supplier {
  _id: string;
  supplierId: string;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  website?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  gstin?: string;
  pan?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode?: string;
  };
  paymentTerms?: string;
  creditLimit?: number;
  creditPeriodDays?: number;
  status: string;
  rating?: number;
  notes?: string;
}

interface SupplierFormData {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  website: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  gstin: string;
  pan: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  paymentTerms: string;
  creditLimit: number;
  creditPeriodDays: number;
  notes: string;
}

const initialFormData: SupplierFormData = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  },
  gstin: "",
  pan: "",
  bankDetails: {
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  },
  paymentTerms: "",
  creditLimit: 0,
  creditPeriodDays: 30,
  notes: "",
};

// Skeleton for suppliers table
function SuppliersTableSkeleton() {
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
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i}>
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
            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function SuppliersPage() {
  const { formatCurrency } = useCurrency();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const loadStartTime = useRef<number>(Date.now());

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    loadStartTime.current = Date.now();
    setIsLoading(true);

    try {
      let url = "/api/suppliers?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data);
      }
    } catch {
      toast.error("Failed to fetch suppliers");
    } finally {
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      setTimeout(() => setIsLoading(false), remaining);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCreate = async () => {
    if (!formData.name || !formData.phone || !formData.address.line1 || !formData.address.city) {
      toast.error("Name, phone, and address are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Supplier created successfully");
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        fetchSuppliers();
      } else {
        toast.error(result.error || "Failed to create supplier");
      }
    } catch {
      toast.error("Failed to create supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSupplier) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/suppliers/${selectedSupplier._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Supplier updated successfully");
        setIsEditDialogOpen(false);
        setSelectedSupplier(null);
        setFormData(initialFormData);
        fetchSuppliers();
      } else {
        toast.error(result.error || "Failed to update supplier");
      }
    } catch {
      toast.error("Failed to update supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/suppliers/${selectedSupplier._id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Supplier deleted");
        setIsDeleteDialogOpen(false);
        setSelectedSupplier(null);
        fetchSuppliers();
      } else {
        toast.error(result.error || "Failed to delete supplier");
      }
    } catch {
      toast.error("Failed to delete supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (supplier: Supplier, newStatus: string) => {
    try {
      const response = await fetch(`/api/suppliers/${supplier._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Supplier ${newStatus}`);
        fetchSuppliers();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      companyName: supplier.companyName || "",
      email: supplier.email || "",
      phone: supplier.phone,
      alternatePhone: supplier.alternatePhone || "",
      website: supplier.website || "",
      address: {
        line1: supplier.address.line1,
        line2: supplier.address.line2 || "",
        city: supplier.address.city,
        state: supplier.address.state,
        postalCode: supplier.address.postalCode,
        country: supplier.address.country,
      },
      gstin: supplier.gstin || "",
      pan: supplier.pan || "",
      bankDetails: {
        bankName: supplier.bankDetails?.bankName || "",
        accountNumber: supplier.bankDetails?.accountNumber || "",
        ifscCode: supplier.bankDetails?.ifscCode || "",
      },
      paymentTerms: supplier.paymentTerms || "",
      creditLimit: supplier.creditLimit || 0,
      creditPeriodDays: supplier.creditPeriodDays || 30,
      notes: supplier.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      blocked: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-muted-foreground">Manage your suppliers and vendors</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <SuppliersTableSkeleton />
                </motion.div>
              ) : suppliers.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12"
                >
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No suppliers found</p>
                  <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Supplier
                  </Button>
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
                      {suppliers.map((supplier, index) => (
                        <motion.tr
                          key={supplier._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-muted/50 transition-colors"
                        >
                    <TableCell className="font-mono text-sm">{supplier.supplierId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.companyName && (
                          <p className="text-sm text-muted-foreground">{supplier.companyName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {supplier.phone}
                        </p>
                        {supplier.email && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {supplier.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {supplier.address.city}, {supplier.address.state}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{supplier.gstin || "-"}</TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedSupplier(supplier); setIsViewDialogOpen(true); }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {supplier.status === "active" ? (
                            <DropdownMenuItem onClick={() => handleStatusChange(supplier, "inactive")}>
                              Mark Inactive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleStatusChange(supplier, "active")}>
                              Mark Active
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => { setSelectedSupplier(supplier); setIsDeleteDialogOpen(true); }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
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

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedSupplier(null);
          setFormData(initialFormData);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? "Update supplier details" : "Add a new supplier"}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alternate Phone</Label>
                  <Input
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    placeholder="Alternate phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Website URL"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </TabsContent>
            <TabsContent value="address" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Address Line 1 *</Label>
                <Input
                  value={formData.address.line1}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, line1: e.target.value } })}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={formData.address.line2}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, line2: e.target.value } })}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={formData.address.city}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Input
                    value={formData.address.state}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Postal Code *</Label>
                  <Input
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postalCode: e.target.value } })}
                    placeholder="Postal code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={formData.address.country}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="financial" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="GST Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="PAN Number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credit Period (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.creditPeriodDays}
                    onChange={(e) => setFormData({ ...formData, creditPeriodDays: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g., Net 30, COD"
                />
              </div>
              <div className="pt-4">
                <h4 className="text-sm font-medium mb-3">Bank Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={formData.bankDetails.bankName}
                      onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={formData.bankDetails.accountNumber}
                      onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={formData.bankDetails.ifscCode}
                      onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() } })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); setFormData(initialFormData); }}>
              Cancel
            </Button>
            <Button onClick={isEditDialogOpen ? handleEdit : handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditDialogOpen ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedSupplier.name}</h3>
                  {selectedSupplier.companyName && (
                    <p className="text-muted-foreground">{selectedSupplier.companyName}</p>
                  )}
                </div>
                {getStatusBadge(selectedSupplier.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier ID</p>
                  <p className="font-mono">{selectedSupplier.supplierId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{selectedSupplier.phone}</p>
                </div>
                {selectedSupplier.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{selectedSupplier.email}</p>
                  </div>
                )}
                {selectedSupplier.gstin && (
                  <div>
                    <p className="text-muted-foreground">GSTIN</p>
                    <p className="font-mono">{selectedSupplier.gstin}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Address</p>
                <p className="text-sm">
                  {selectedSupplier.address.line1}
                  {selectedSupplier.address.line2 && `, ${selectedSupplier.address.line2}`}
                  <br />
                  {selectedSupplier.address.city}, {selectedSupplier.address.state} - {selectedSupplier.address.postalCode}
                </p>
              </div>
              {(selectedSupplier.creditLimit || selectedSupplier.paymentTerms) && (
                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                  {selectedSupplier.creditLimit && (
                    <div>
                      <p className="text-muted-foreground">Credit Limit</p>
                      <p>{formatCurrency(selectedSupplier.creditLimit)}</p>
                    </div>
                  )}
                  {selectedSupplier.paymentTerms && (
                    <div>
                      <p className="text-muted-foreground">Payment Terms</p>
                      <p>{selectedSupplier.paymentTerms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); if (selectedSupplier) openEditDialog(selectedSupplier); }}>
              Edit Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this supplier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
