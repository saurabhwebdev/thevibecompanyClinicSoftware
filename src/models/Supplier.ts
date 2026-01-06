import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISupplierContact {
  name: string;
  designation?: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  supplierId: string;
  name: string;
  companyName?: string;
  // Contact Information
  email?: string;
  phone: string;
  alternatePhone?: string;
  website?: string;
  // Address
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  // Tax Information
  gstin?: string;
  pan?: string;
  taxRegistrationNumber?: string;
  // Banking Details
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode?: string;
    routingCode?: string;
    accountType: string;
    branchName?: string;
  };
  // Business Details
  businessType?: string;
  paymentTerms?: string;
  creditLimit?: number;
  creditPeriodDays?: number;
  // Contacts
  contacts: ISupplierContact[];
  // Categories they supply
  categories: Types.ObjectId[];
  // Status
  status: "active" | "inactive" | "blocked";
  rating?: number;
  notes?: string;
  // Metadata
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierContactSchema = new Schema<ISupplierContact>(
  {
    name: { type: String, required: true },
    designation: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const SupplierSchema: Schema<ISupplier> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    supplierId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: [200, "Supplier name cannot exceed 200 characters"],
    },
    companyName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: "India" },
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
    },
    pan: {
      type: String,
      uppercase: true,
      trim: true,
    },
    taxRegistrationNumber: {
      type: String,
      trim: true,
    },
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      routingCode: { type: String },
      accountType: { type: String, default: "current" },
      branchName: { type: String },
    },
    businessType: {
      type: String,
      trim: true,
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },
    creditPeriodDays: {
      type: Number,
      min: 0,
      default: 30,
    },
    contacts: {
      type: [SupplierContactSchema],
      default: [],
    },
    categories: [{
      type: Schema.Types.ObjectId,
      ref: "Category",
    }],
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
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
SupplierSchema.index({ tenantId: 1, supplierId: 1 }, { unique: true });
SupplierSchema.index({ tenantId: 1, name: 1 });
SupplierSchema.index({ tenantId: 1, status: 1 });
SupplierSchema.index({ tenantId: 1, gstin: 1 });

const Supplier: Model<ISupplier> =
  mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema);

export default Supplier;
