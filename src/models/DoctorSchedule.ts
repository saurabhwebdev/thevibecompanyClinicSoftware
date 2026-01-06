import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITimeSlot {
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface IDaySchedule {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  isWorking: boolean;
  slots: ITimeSlot[];
}

export interface ILeaveDate {
  date: Date;
  reason?: string;
}

export interface IDoctorSchedule extends Document {
  doctorId: Types.ObjectId;
  tenantId: Types.ObjectId;
  weeklySchedule: IDaySchedule[];
  slotDuration: number; // in minutes (15, 20, 30, 45, 60)
  bufferTime: number; // break between appointments in minutes
  maxPatientsPerSlot: number; // for clinics allowing multiple patients per slot
  advanceBookingDays: number; // how many days in advance can book
  isAcceptingAppointments: boolean;
  acceptsOnlineBooking: boolean; // for public booking
  consultationFee: number;
  specialization?: string;
  qualifications?: string;
  bio?: string;
  leaveDates: ILeaveDate[]; // blocked dates
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const DayScheduleSchema = new Schema<IDaySchedule>(
  {
    day: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: true,
    },
    isWorking: {
      type: Boolean,
      default: true,
    },
    slots: {
      type: [TimeSlotSchema],
      default: [],
    },
  },
  { _id: false }
);

const LeaveDateSchema = new Schema<ILeaveDate>(
  {
    date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
    },
  },
  { _id: false }
);

const DoctorScheduleSchema: Schema<IDoctorSchedule> = new Schema(
  {
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
    weeklySchedule: {
      type: [DayScheduleSchema],
      default: [
        { day: "monday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
        { day: "tuesday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
        { day: "wednesday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
        { day: "thursday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
        { day: "friday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
        { day: "saturday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }] },
        { day: "sunday", isWorking: false, slots: [] },
      ],
    },
    slotDuration: {
      type: Number,
      default: 30,
      enum: [15, 20, 30, 45, 60],
    },
    bufferTime: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },
    maxPatientsPerSlot: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    advanceBookingDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 90,
    },
    isAcceptingAppointments: {
      type: Boolean,
      default: true,
    },
    acceptsOnlineBooking: {
      type: Boolean,
      default: false,
    },
    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    specialization: {
      type: String,
      trim: true,
    },
    qualifications: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    leaveDates: {
      type: [LeaveDateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
DoctorScheduleSchema.index({ tenantId: 1, doctorId: 1 }, { unique: true });
DoctorScheduleSchema.index({ tenantId: 1, acceptsOnlineBooking: 1 });
DoctorScheduleSchema.index({ tenantId: 1, isAcceptingAppointments: 1 });

// Delete cached model if exists
if (mongoose.models.DoctorSchedule) {
  delete mongoose.models.DoctorSchedule;
}

const DoctorSchedule: Model<IDoctorSchedule> = mongoose.model<IDoctorSchedule>("DoctorSchedule", DoctorScheduleSchema);

export default DoctorSchedule;
