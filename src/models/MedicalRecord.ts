import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IVitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

export interface IMedicalRecord extends Document {
  patientId: Types.ObjectId;
  visitDate: Date;
  visitType: "consultation" | "follow-up" | "emergency" | "routine-checkup" | "procedure";
  chiefComplaint: string;
  presentIllness?: string;
  vitalSigns?: IVitalSigns;
  examination?: string;
  diagnosis: string[];
  differentialDiagnosis?: string[];
  treatmentPlan?: string;
  procedures?: string[];
  labOrdersRequested?: string[];
  imagingOrdersRequested?: string[];
  referrals?: string[];
  followUpDate?: Date;
  followUpInstructions?: string;
  notes?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
  doctorId: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VitalSignsSchema = new Schema<IVitalSigns>(
  {
    bloodPressureSystolic: Number,
    bloodPressureDiastolic: Number,
    heartRate: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
  },
  { _id: false }
);

const MedicalRecordSchema: Schema<IMedicalRecord> = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    visitDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    visitType: {
      type: String,
      enum: ["consultation", "follow-up", "emergency", "routine-checkup", "procedure"],
      required: true,
      default: "consultation",
    },
    chiefComplaint: {
      type: String,
      required: [true, "Chief complaint is required"],
    },
    presentIllness: String,
    vitalSigns: VitalSignsSchema,
    examination: String,
    diagnosis: [{
      type: String,
      required: true,
    }],
    differentialDiagnosis: [String],
    treatmentPlan: String,
    procedures: [String],
    labOrdersRequested: [String],
    imagingOrdersRequested: [String],
    referrals: [String],
    followUpDate: Date,
    followUpInstructions: String,
    notes: String,
    attachments: [{
      name: String,
      url: String,
      type: String,
    }],
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
MedicalRecordSchema.index({ tenantId: 1, patientId: 1 });
MedicalRecordSchema.index({ tenantId: 1, visitDate: -1 });
MedicalRecordSchema.index({ tenantId: 1, doctorId: 1 });

const MedicalRecord: Model<IMedicalRecord> =
  mongoose.models.MedicalRecord || mongoose.model<IMedicalRecord>("MedicalRecord", MedicalRecordSchema);

export default MedicalRecord;
