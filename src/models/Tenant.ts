import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  settings: {
    theme?: string;
    logo?: string;
    primaryColor?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema<ITenant> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Tenant name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Tenant slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      theme: { type: String, default: "light" },
      logo: { type: String },
      primaryColor: { type: String, default: "#0066cc" },
    },
  },
  {
    timestamps: true,
  }
);

const Tenant: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);

export default Tenant;
