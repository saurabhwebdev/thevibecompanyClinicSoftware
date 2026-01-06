import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IStockMovement extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  movementId: string;
  productId: Types.ObjectId;
  // Movement Type
  type: "purchase" | "sale" | "adjustment" | "return" | "transfer" | "expired" | "damaged" | "opening";
  direction: "in" | "out";
  // Quantities
  quantity: number;
  previousStock: number;
  newStock: number;
  // Batch Information (if applicable)
  batchNumber?: string;
  expiryDate?: Date;
  // Pricing
  unitPrice: number;
  totalValue: number;
  // Reference
  referenceType?: "purchase_order" | "sale_invoice" | "adjustment" | "return" | "prescription";
  referenceId?: Types.ObjectId;
  referenceNumber?: string;
  // Supplier (for purchases)
  supplierId?: Types.ObjectId;
  // Patient (for sales/prescriptions)
  patientId?: Types.ObjectId;
  // Reason (for adjustments/returns/damage)
  reason?: string;
  notes?: string;
  // Location
  fromLocation?: string;
  toLocation?: string;
  // Status
  status: "pending" | "completed" | "cancelled";
  // Metadata
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema: Schema<IStockMovement> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    movementId: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      enum: ["purchase", "sale", "adjustment", "return", "transfer", "expired", "damaged", "opening"],
      required: true,
    },
    direction: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity must be positive"],
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["purchase_order", "sale_invoice", "adjustment", "return", "prescription"],
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    fromLocation: {
      type: String,
      trim: true,
    },
    toLocation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StockMovementSchema.index({ tenantId: 1, movementId: 1 }, { unique: true });
StockMovementSchema.index({ tenantId: 1, productId: 1 });
StockMovementSchema.index({ tenantId: 1, type: 1 });
StockMovementSchema.index({ tenantId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, supplierId: 1 });
StockMovementSchema.index({ tenantId: 1, referenceId: 1 });

const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement || mongoose.model<IStockMovement>("StockMovement", StockMovementSchema);

export default StockMovement;
