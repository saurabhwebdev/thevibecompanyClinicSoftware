import Appointment from "@/models/Appointment";
import { Types } from "mongoose";

/**
 * Token Generation Utility
 * Generates sequential daily token numbers for patient check-ins
 */

export interface TokenGenerationResult {
  tokenNumber: number;
  tokenDisplayNumber: string;
  estimatedWaitMinutes: number;
}

/**
 * Generate the next token number for a tenant on a specific date
 * Token numbers reset daily starting from 1
 */
export async function generateNextToken(
  tenantId: Types.ObjectId | string,
  appointmentDate: Date
): Promise<TokenGenerationResult> {
  // Normalize the date to start of day
  const startOfDay = new Date(appointmentDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(appointmentDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Find the highest token number for this tenant on this date
  const lastTokenAppointment = await Appointment.findOne({
    tenantId: new Types.ObjectId(tenantId.toString()),
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    tokenNumber: { $ne: null },
  })
    .sort({ tokenNumber: -1 })
    .select("tokenNumber")
    .lean();

  const nextTokenNumber = lastTokenAppointment?.tokenNumber
    ? lastTokenAppointment.tokenNumber + 1
    : 1;

  // Format token display number (e.g., T-001, T-012, T-123)
  const tokenDisplayNumber = `T-${nextTokenNumber.toString().padStart(3, "0")}`;

  // Calculate estimated wait time based on queue position
  const estimatedWaitMinutes = await calculateEstimatedWait(
    tenantId,
    appointmentDate,
    nextTokenNumber
  );

  return {
    tokenNumber: nextTokenNumber,
    tokenDisplayNumber,
    estimatedWaitMinutes,
  };
}

/**
 * Calculate estimated wait time based on queue position and average service time
 */
export async function calculateEstimatedWait(
  tenantId: Types.ObjectId | string,
  appointmentDate: Date,
  tokenNumber: number
): Promise<number> {
  const startOfDay = new Date(appointmentDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(appointmentDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Count patients ahead in queue (checked-in but not yet in-progress or completed)
  const patientsAhead = await Appointment.countDocuments({
    tenantId: new Types.ObjectId(tenantId.toString()),
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    tokenNumber: { $lt: tokenNumber, $ne: null },
    status: "checked-in",
  });

  // Average consultation time (default 15 minutes per patient)
  const avgConsultationTime = 15;

  return patientsAhead * avgConsultationTime;
}

/**
 * Get current queue status for a tenant on a specific date
 */
export async function getQueueStatus(
  tenantId: Types.ObjectId | string,
  appointmentDate?: Date
) {
  const targetDate = appointmentDate || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const tenantObjectId = new Types.ObjectId(tenantId.toString());

  // Get current serving token (in-progress)
  const currentServing = await Appointment.findOne({
    tenantId: tenantObjectId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: "in-progress",
    tokenNumber: { $ne: null },
  })
    .sort({ tokenNumber: 1 })
    .populate("patientId", "firstName lastName")
    .populate("doctorId", "name")
    .lean();

  // Get waiting queue (checked-in, not yet in-progress)
  const waitingQueue = await Appointment.find({
    tenantId: tenantObjectId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: "checked-in",
    tokenNumber: { $ne: null },
  })
    .sort({ tokenNumber: 1 })
    .populate("patientId", "firstName lastName")
    .populate("doctorId", "name")
    .lean();

  // Get completed today
  const completedCount = await Appointment.countDocuments({
    tenantId: tenantObjectId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: "completed",
    tokenNumber: { $ne: null },
  });

  // Get total checked-in today
  const totalCheckedIn = await Appointment.countDocuments({
    tenantId: tenantObjectId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    tokenNumber: { $ne: null },
  });

  return {
    currentServing,
    waitingQueue,
    waitingCount: waitingQueue.length,
    completedCount,
    totalCheckedIn,
    nextToken: waitingQueue[0] || null,
  };
}

/**
 * Get queue status by doctor
 */
export async function getQueueStatusByDoctor(
  tenantId: Types.ObjectId | string,
  doctorId: Types.ObjectId | string,
  appointmentDate?: Date
) {
  const targetDate = appointmentDate || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const tenantObjectId = new Types.ObjectId(tenantId.toString());
  const doctorObjectId = new Types.ObjectId(doctorId.toString());

  // Get current serving for this doctor
  const currentServing = await Appointment.findOne({
    tenantId: tenantObjectId,
    doctorId: doctorObjectId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: "in-progress",
    tokenNumber: { $ne: null },
  })
    .populate("patientId", "firstName lastName")
    .lean();

  // Get waiting queue for this doctor
  const waitingQueue = await Appointment.find({
    tenantId: tenantObjectId,
    doctorId: doctorObjectId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: "checked-in",
    tokenNumber: { $ne: null },
  })
    .sort({ tokenNumber: 1 })
    .populate("patientId", "firstName lastName")
    .lean();

  return {
    currentServing,
    waitingQueue,
    waitingCount: waitingQueue.length,
    nextToken: waitingQueue[0] || null,
  };
}

/**
 * Update estimated wait times for all waiting patients
 */
export async function refreshEstimatedWaitTimes(
  tenantId: Types.ObjectId | string,
  appointmentDate?: Date
): Promise<void> {
  const targetDate = appointmentDate || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const tenantObjectId = new Types.ObjectId(tenantId.toString());

  // Get all checked-in appointments
  const waitingAppointments = await Appointment.find({
    tenantId: tenantObjectId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: "checked-in",
    tokenNumber: { $ne: null },
  }).sort({ tokenNumber: 1 });

  // Update each with estimated wait time based on position
  const avgConsultationTime = 15; // minutes

  for (let i = 0; i < waitingAppointments.length; i++) {
    await Appointment.updateOne(
      { _id: waitingAppointments[i]._id },
      { estimatedWaitMinutes: i * avgConsultationTime }
    );
  }
}

/**
 * Find appointment by token display number
 */
export async function findByToken(
  tenantId: Types.ObjectId | string,
  tokenDisplayNumber: string,
  appointmentDate?: Date
) {
  const targetDate = appointmentDate || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return Appointment.findOne({
    tenantId: new Types.ObjectId(tenantId.toString()),
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    tokenDisplayNumber: tokenDisplayNumber.toUpperCase(),
  })
    .populate("patientId", "firstName lastName email phone")
    .populate("doctorId", "name")
    .lean();
}
