import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAppointment extends Document {
  appointmentId: string;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  type: "consultation" | "follow-up" | "procedure" | "emergency" | "routine-checkup" | "vaccination";
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  reason: string;
  notes?: string;
  symptoms?: string[];
  priority: "normal" | "urgent" | "emergency";
  isFirstVisit: boolean;
  reminderSent: boolean;
  confirmationSent: boolean;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancellationReason?: string;
  rescheduledFrom?: Types.ObjectId;
  medicalRecordId?: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema<IAppointment> = new Schema(
  {
    appointmentId: {
      type: String,
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
    },
    duration: {
      type: Number,
      required: true,
      default: 30,
    },
    type: {
      type: String,
      enum: ["consultation", "follow-up", "procedure", "emergency", "routine-checkup", "vaccination"],
      default: "consultation",
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    reason: {
      type: String,
      required: [true, "Reason for appointment is required"],
    },
    notes: String,
    symptoms: [String],
    priority: {
      type: String,
      enum: ["normal", "urgent", "emergency"],
      default: "normal",
    },
    isFirstVisit: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    confirmationSent: {
      type: Boolean,
      default: false,
    },
    cancelledAt: Date,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,
    rescheduledFrom: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    medicalRecordId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalRecord",
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
AppointmentSchema.index({ tenantId: 1, appointmentId: 1 }, { unique: true });
AppointmentSchema.index({ tenantId: 1, appointmentDate: 1 });
AppointmentSchema.index({ tenantId: 1, patientId: 1 });
AppointmentSchema.index({ tenantId: 1, doctorId: 1, appointmentDate: 1 });
AppointmentSchema.index({ tenantId: 1, status: 1 });

const Appointment: Model<IAppointment> =
  mongoose.models.Appointment || mongoose.model<IAppointment>("Appointment", AppointmentSchema);

export default Appointment;
