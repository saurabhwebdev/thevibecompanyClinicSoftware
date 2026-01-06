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
  Package,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  PackagePlus,
  PackageMinus,
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
import { Switch } from "@/components/ui/switch";
import { useCurrency } from "@/components/currency-provider";

interface Category {
  _id: string;
  name: string;
  type: string;
}

interface Supplier {
  _id: string;
  name: string;
  supplierId: string;
}

interface Product {
  _id: string;
  sku: string;
  name: string;
  genericName?: string;
  description?: string;
  categoryId: Category;
  type: string;
  manufacturer?: string;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  hsnCode?: string;
  currentStock: number;
  minStockLevel: number;
  reorderLevel: number;
  unit: string;
  status: string;
  isLowStock: boolean;
  hasExpiringStock: boolean;
  preferredSupplierId?: Supplier;
  batchTracking: boolean;
}

interface ProductFormData {
  name: string;
  genericName: string;
  description: string;
  categoryId: string;
  type: string;
  manufacturer: string;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  hsnCode: string;
  currentStock: number;
  minStockLevel: number;
  reorderLevel: number;
  unit: string;
  preferredSupplierId: string;
  batchTracking: boolean;
}

interface StockAdjustment {
  action: string;
  quantity: number;
  reason: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
}

const initialFormData: ProductFormData = {
  name: "",
  genericName: "",
  description: "",
  categoryId: "",
  type: "product",
  manufacturer: "",
  costPrice: 0,
  sellingPrice: 0,
  mrp: 0,
  taxRate: 18,
  hsnCode: "",
  currentStock: 0,
  minStockLevel: 10,
  reorderLevel: 20,
  unit: "pcs",
  preferredSupplierId: "",
  batchTracking: false,
};

const productTypes = [
  { value: "product", label: "Product" },
  { value: "medicine", label: "Medicine" },
  { value: "consumable", label: "Consumable" },
  { value: "equipment", label: "Equipment" },
  { value: "service", label: "Service" },
];

const units = ["pcs", "box", "strip", "bottle", "pack", "kg", "g", "ml", "l"];

const taxRates = [0, 5, 12, 18, 28];

export default function InventoryPage() {
  const { formatCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summary, setSummary] = useState({ lowStockCount: 0, expiringCount: 0, totalValue: 0 });
  const loadStartTime = useRef<number>(Date.now());

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment>({
    action: "add",
    quantity: 0,
    reason: "",
    batchNumber: "",
    expiryDate: "",
    purchasePrice: 0,
  });
  const [newCategory, setNewCategory] = useState({ name: "", type: "product", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    loadStartTime.current = Date.now();
    setIsLoading(true);

    try {
      let url = "/api/products?";
      if (typeFilter !== "all") url += `type=${typeFilter}&`;
      if (statusFilter === "lowStock") url += "lowStock=true&";
      if (statusFilter === "expiring") url += "expiring=true&";
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
        setSummary(result.summary || { lowStockCount: 0, expiringCount: 0, totalValue: 0 });
      }
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      setTimeout(() => setIsLoading(false), remaining);
    }
  }, [typeFilter, statusFilter, searchQuery]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories?status=active");
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch {
      console.error("Failed to fetch categories");
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetch("/api/suppliers?status=active");
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data);
      }
    } catch {
      console.error("Failed to fetch suppliers");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
  }, [fetchProducts, fetchCategories, fetchSuppliers]);

  const handleCreateProduct = async () => {
    if (!formData.name || !formData.categoryId) {
      toast.error("Name and category are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Product created successfully");
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        fetchProducts();
      } else {
        toast.error(result.error || "Failed to create product");
      }
    } catch {
      toast.error("Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Product updated successfully");
        setIsEditDialogOpen(false);
        setSelectedProduct(null);
        setFormData(initialFormData);
        fetchProducts();
      } else {
        toast.error(result.error || "Failed to update product");
      }
    } catch {
      toast.error("Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Product deleted");
        setIsDeleteDialogOpen(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        toast.error(result.error || "Failed to delete product");
      }
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct || stockAdjustment.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stockAdjustment),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message || "Stock adjusted successfully");
        setIsStockDialogOpen(false);
        setSelectedProduct(null);
        setStockAdjustment({ action: "add", quantity: 0, reason: "", batchNumber: "", expiryDate: "", purchasePrice: 0 });
        fetchProducts();
      } else {
        toast.error(result.error || "Failed to adjust stock");
      }
    } catch {
      toast.error("Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Category created");
        setIsCategoryDialogOpen(false);
        setNewCategory({ name: "", type: "product", description: "" });
        fetchCategories();
      } else {
        toast.error(result.error || "Failed to create category");
      }
    } catch {
      toast.error("Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      genericName: product.genericName || "",
      description: product.description || "",
      categoryId: product.categoryId._id,
      type: product.type,
      manufacturer: product.manufacturer || "",
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      taxRate: product.taxRate,
      hsnCode: product.hsnCode || "",
      currentStock: product.currentStock,
      minStockLevel: product.minStockLevel,
      reorderLevel: product.reorderLevel,
      unit: product.unit,
      preferredSupplierId: product.preferredSupplierId?._id || "",
      batchTracking: product.batchTracking,
    });
    setIsEditDialogOpen(true);
  };

  const openStockDialog = (product: Product, action: string) => {
    setSelectedProduct(product);
    setStockAdjustment({
      action,
      quantity: 0,
      reason: "",
      batchNumber: "",
      expiryDate: "",
      purchasePrice: product.costPrice,
    });
    setIsStockDialogOpen(true);
  };

  // Skeleton for inventory table
  const InventoryTableSkeleton = () => (
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
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
            <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">Manage products and stock levels</p>
        </div>
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Category
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { title: "Total Products", value: products.length, icon: Package, color: "", iconColor: "" },
          { title: "Low Stock Items", value: summary.lowStockCount, icon: AlertTriangle, color: "text-orange-500", iconColor: "text-orange-500" },
          { title: "Expiring Soon", value: summary.expiringCount, icon: Clock, color: "text-red-500", iconColor: "text-red-500" },
          { title: "Stock Value", value: formatCurrency(summary.totalValue), icon: ArrowUpDown, color: "", iconColor: "" },
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {productTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="lowStock">Low Stock</SelectItem>
                  <SelectItem value="expiring">Expiring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
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
                <InventoryTableSkeleton />
              </motion.div>
            ) : products.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No products found</p>
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
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
                    {products.map((product, index) => (
                      <motion.tr
                        key={product._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.genericName && (
                              <p className="text-sm text-muted-foreground">{product.genericName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.categoryId?.name || "Uncategorized"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.costPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell className="text-center">
                          <span className={product.isLowStock ? "text-orange-500 font-medium" : ""}>
                            {product.currentStock} {product.unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {product.isLowStock && (
                              <Badge variant="destructive" className="text-xs">Low</Badge>
                            )}
                            {product.hasExpiringStock && (
                              <Badge variant="secondary" className="text-xs">Expiring</Badge>
                            )}
                            {!product.isLowStock && !product.hasExpiringStock && (
                              <Badge variant="outline" className="text-xs">OK</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(product)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openStockDialog(product, "add")}>
                                <PackagePlus className="mr-2 h-4 w-4" /> Add Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openStockDialog(product, "remove")}>
                                <PackageMinus className="mr-2 h-4 w-4" /> Remove Stock
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => { setSelectedProduct(product); setIsDeleteDialogOpen(true); }}
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

      {/* Create/Edit Product Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedProduct(null);
          setFormData(initialFormData);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? "Update product details" : "Add a new product to inventory"}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Tax</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Generic Name</Label>
                  <Input
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="Generic name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Manufacturer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={formData.preferredSupplierId} onValueChange={(v) => setFormData({ ...formData, preferredSupplierId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </TabsContent>
            <TabsContent value="pricing" className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cost Price *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MRP *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Select value={formData.taxRate.toString()} onValueChange={(v) => setFormData({ ...formData, taxRate: parseInt(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxRates.map((r) => (
                        <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>HSN Code</Label>
                  <Input
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    placeholder="HSN/SAC code"
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="stock" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isEditDialogOpen && (
                  <div className="space-y-2">
                    <Label>Opening Stock</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Stock Level</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="batchTracking"
                  checked={formData.batchTracking}
                  onCheckedChange={(checked) => setFormData({ ...formData, batchTracking: checked })}
                />
                <Label htmlFor="batchTracking">Enable batch/expiry tracking</Label>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); setFormData(initialFormData); }}>
              Cancel
            </Button>
            <Button onClick={isEditDialogOpen ? handleEditProduct : handleCreateProduct} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditDialogOpen ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockAdjustment.action === "add" ? "Add Stock" : "Remove Stock"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} (Current: {selectedProduct?.currentStock} {selectedProduct?.unit})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={stockAdjustment.quantity || ""}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) || 0 })}
                placeholder="Enter quantity"
              />
            </div>
            {stockAdjustment.action === "add" && selectedProduct?.batchTracking && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input
                      value={stockAdjustment.batchNumber}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, batchNumber: e.target.value })}
                      placeholder="Batch #"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={stockAdjustment.expiryDate}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, expiryDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockAdjustment.purchasePrice}
                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, purchasePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={stockAdjustment.reason}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                placeholder="Reason for adjustment"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStockAdjustment} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {stockAdjustment.action === "add" ? "Add Stock" : "Remove Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new category for products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newCategory.type} onValueChange={(v) => setNewCategory({ ...newCategory, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="medicine">Medicine</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {selectedProduct?.currentStock ? "Note: This product has existing stock." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
