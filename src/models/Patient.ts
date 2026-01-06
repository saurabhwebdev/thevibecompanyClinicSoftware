import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IPatient extends Document {
  patientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: IEmergencyContact;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  notes?: string;
  isActive: boolean;
  tenantId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const PatientSchema: Schema<IPatient> = new Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    emergencyContact: EmergencyContactSchema,
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    currentMedications: [{ type: String }],
    insuranceProvider: String,
    insurancePolicyNumber: String,
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
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
PatientSchema.index({ tenantId: 1, patientId: 1 }, { unique: true });
PatientSchema.index({ tenantId: 1, lastName: 1, firstName: 1 });
PatientSchema.index({ tenantId: 1, phone: 1 });
PatientSchema.index({ tenantId: 1, email: 1 });

const Patient: Model<IPatient> =
  mongoose.models.Patient || mongoose.model<IPatient>("Patient", PatientSchema);

export default Patient;
