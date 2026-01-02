import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPermission {
  resource: string;
  actions: ("create" | "read" | "update" | "delete")[];
}

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: IPermission[];
  tenantId: Types.ObjectId;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      required: true,
    },
    actions: [{
      type: String,
      enum: ["create", "read", "update", "delete"],
    }],
  },
  { _id: false }
);

const RoleSchema: Schema<IRole> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [PermissionSchema],
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique role name per tenant
RoleSchema.index({ name: 1, tenantId: 1 }, { unique: true });

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);

export default Role;
