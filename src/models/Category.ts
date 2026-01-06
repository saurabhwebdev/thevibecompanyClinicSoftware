import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICategory extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentId?: Types.ObjectId;
  type: "product" | "service" | "medicine";
  image?: string;
  isActive: boolean;
  sortOrder: number;
  // Tax defaults for this category
  defaultTaxRate?: number;
  defaultHsnCode?: string;
  defaultSacCode?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    type: {
      type: String,
      enum: ["product", "service", "medicine"],
      default: "product",
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    defaultTaxRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    defaultHsnCode: {
      type: String,
      trim: true,
    },
    defaultSacCode: {
      type: String,
      trim: true,
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

// Compound index for unique category name per tenant
CategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
CategorySchema.index({ tenantId: 1, slug: 1 });
CategorySchema.index({ tenantId: 1, type: 1 });

// Pre-save hook to generate slug
CategorySchema.pre("save", function () {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
