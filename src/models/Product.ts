import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IProductBatch {
  batchNumber: string;
  quantity: number;
  manufacturingDate?: Date;
  expiryDate?: Date;
  purchasePrice: number;
  purchaseDate: Date;
  supplierId?: Types.ObjectId;
  invoiceNumber?: string;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  // Basic Information
  sku: string;
  name: string;
  genericName?: string;
  description?: string;
  categoryId: Types.ObjectId;
  type: "product" | "medicine" | "consumable" | "equipment" | "service";
  // For medicines
  manufacturer?: string;
  composition?: string;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  prescriptionRequired: boolean;
  // Pricing
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  discountPercent?: number;
  // Tax Information
  taxRate: number;
  hsnCode?: string;
  sacCode?: string;
  taxInclusive: boolean;
  // Stock Information
  currentStock: number;
  minStockLevel: number;
  maxStockLevel?: number;
  reorderLevel: number;
  reorderQuantity?: number;
  unit: string;
  // Batch Tracking
  batchTracking: boolean;
  batches: IProductBatch[];
  // Location
  location?: string;
  shelf?: string;
  rack?: string;
  // Supplier
  preferredSupplierId?: Types.ObjectId;
  alternateSuppliers: Types.ObjectId[];
  // Images
  images: string[];
  // Status
  status: "active" | "inactive" | "discontinued";
  isLowStock: boolean;
  hasExpiringStock: boolean;
  // Metadata
  barcode?: string;
  tags: string[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductBatchSchema = new Schema<IProductBatch>(
  {
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    manufacturingDate: { type: Date },
    expiryDate: { type: Date },
    purchasePrice: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    invoiceNumber: { type: String },
  },
  { _id: true }
);

const ProductSchema: Schema<IProduct> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    genericName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    type: {
      type: String,
      enum: ["product", "medicine", "consumable", "equipment", "service"],
      default: "product",
    },
    // Medicine specific
    manufacturer: { type: String, trim: true },
    composition: { type: String, trim: true },
    dosageForm: { type: String, trim: true },
    strength: { type: String, trim: true },
    packSize: { type: String, trim: true },
    prescriptionRequired: { type: Boolean, default: false },
    // Pricing
    costPrice: {
      type: Number,
      required: [true, "Cost price is required"],
      min: [0, "Cost price cannot be negative"],
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },
    mrp: {
      type: Number,
      required: [true, "MRP is required"],
      min: [0, "MRP cannot be negative"],
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Tax
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 18,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    sacCode: {
      type: String,
      trim: true,
    },
    taxInclusive: {
      type: Boolean,
      default: false,
    },
    // Stock
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: 0,
    },
    maxStockLevel: {
      type: Number,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 20,
      min: 0,
    },
    reorderQuantity: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true,
    },
    // Batch
    batchTracking: {
      type: Boolean,
      default: false,
    },
    batches: {
      type: [ProductBatchSchema],
      default: [],
    },
    // Location
    location: { type: String, trim: true },
    shelf: { type: String, trim: true },
    rack: { type: String, trim: true },
    // Suppliers
    preferredSupplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
    },
    alternateSuppliers: [{
      type: Schema.Types.ObjectId,
      ref: "Supplier",
    }],
    // Images
    images: [{
      type: String,
    }],
    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
    },
    isLowStock: {
      type: Boolean,
      default: false,
    },
    hasExpiringStock: {
      type: Boolean,
      default: false,
    },
    // Meta
    barcode: { type: String, trim: true },
    tags: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, name: "text", genericName: "text" });
ProductSchema.index({ tenantId: 1, categoryId: 1 });
ProductSchema.index({ tenantId: 1, status: 1 });
ProductSchema.index({ tenantId: 1, type: 1 });
ProductSchema.index({ tenantId: 1, isLowStock: 1 });
ProductSchema.index({ tenantId: 1, hasExpiringStock: 1 });
ProductSchema.index({ tenantId: 1, barcode: 1 });

// Pre-save hook to update low stock and expiry flags
ProductSchema.pre("save", function () {
  // Check low stock
  this.isLowStock = this.currentStock <= this.reorderLevel;

  // Check expiring stock (within 90 days)
  if (this.batchTracking && this.batches.length > 0) {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    this.hasExpiringStock = this.batches.some(
      (batch) => batch.expiryDate && batch.expiryDate <= ninetyDaysFromNow && batch.quantity > 0
    );
  } else {
    this.hasExpiringStock = false;
  }
});

// Virtual for calculating stock value
ProductSchema.virtual("stockValue").get(function () {
  return this.currentStock * this.costPrice;
});

// Method to calculate tax amount
ProductSchema.methods.calculateTax = function (quantity: number = 1) {
  const basePrice = this.sellingPrice * quantity;
  if (this.taxInclusive) {
    const taxAmount = basePrice - basePrice / (1 + this.taxRate / 100);
    return {
      basePrice: basePrice - taxAmount,
      taxAmount,
      totalPrice: basePrice,
    };
  } else {
    const taxAmount = (basePrice * this.taxRate) / 100;
    return {
      basePrice,
      taxAmount,
      totalPrice: basePrice + taxAmount,
    };
  }
};

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
