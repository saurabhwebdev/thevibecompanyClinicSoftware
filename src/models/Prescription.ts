import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: "oral" | "topical" | "injection" | "inhalation" | "sublingual" | "rectal" | "other";
  instructions?: string;
  quantity?: number;
  refills?: number;
}

export interface IPrescription extends Document {
  prescriptionId: string;
  patientId: Types.ObjectId;
  medicalRecordId?: Types.ObjectId;
  medications: IMedication[];
  prescriptionDate: Date;
  validUntil?: Date;
  diagnosis?: string;
  notes?: string;
  isDispensed: boolean;
  dispensedDate?: Date;
  dispensedBy?: Types.ObjectId;
  pharmacyNotes?: string;
  doctorId: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema<IMedication>(
  {
    name: {
      type: String,
      required: [true, "Medication name is required"],
    },
    dosage: {
      type: String,
      required: [true, "Dosage is required"],
    },
    frequency: {
      type: String,
      required: [true, "Frequency is required"],
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
    },
    route: {
      type: String,
      enum: ["oral", "topical", "injection", "inhalation", "sublingual", "rectal", "other"],
      default: "oral",
    },
    instructions: String,
    quantity: Number,
    refills: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const PrescriptionSchema: Schema<IPrescription> = new Schema(
  {
    prescriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    medicalRecordId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalRecord",
    },
    medications: {
      type: [MedicationSchema],
      required: true,
      validate: {
        validator: function(v: IMedication[]) {
          return v && v.length > 0;
        },
        message: "At least one medication is required",
      },
    },
    prescriptionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: Date,
    diagnosis: String,
    notes: String,
    isDispensed: {
      type: Boolean,
      default: false,
    },
    dispensedDate: Date,
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    pharmacyNotes: String,
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PrescriptionSchema.index({ tenantId: 1, prescriptionId: 1 }, { unique: true });
PrescriptionSchema.index({ tenantId: 1, patientId: 1 });
PrescriptionSchema.index({ tenantId: 1, prescriptionDate: -1 });
PrescriptionSchema.index({ tenantId: 1, doctorId: 1 });

const Prescription: Model<IPrescription> =
  mongoose.models.Prescription || mongoose.model<IPrescription>("Prescription", PrescriptionSchema);

export default Prescription;
