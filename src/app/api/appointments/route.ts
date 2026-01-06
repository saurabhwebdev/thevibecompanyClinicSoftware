import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Appointment from "@/models/Appointment";
import Patient from "@/models/Patient";
import { sendAppointmentConfirmationEmail, isEmailEnabled } from "@/lib/email";
import { format } from "date-fns";

// Generate unique appointment ID
async function generateAppointmentId(tenantId: string): Promise<string> {
  const count = await Appointment.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `APT${paddedNumber}`;
}

// GET all appointments for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "appointments" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    // Filter by specific date
    if (date) {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: dateStart, $lte: dateEnd };
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: start, $lte: end };
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (doctorId) {
      query.doctorId = doctorId;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .sort({ appointmentDate: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .populate("patientId", "firstName lastName patientId phone email")
        .populate("doctorId", "name email")
        .populate("createdBy", "name"),
      Appointment.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

// POST create a new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "appointments" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      patientId,
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      duration,
      type,
      reason,
      notes,
      symptoms,
      priority,
      isFirstVisit,
    } = body;

    if (!patientId || !doctorId || !appointmentDate || !startTime || !endTime || !reason) {
      return NextResponse.json(
        { error: "Patient, doctor, date, time, and reason are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify patient exists
    const patient = await Patient.findOne({
      _id: patientId,
      tenantId: session.user.tenant.id,
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Check for conflicting appointments
    const appointmentDateObj = new Date(appointmentDate);
    const dateStart = new Date(appointmentDateObj);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(appointmentDateObj);
    dateEnd.setHours(23, 59, 59, 999);

    const conflictingAppointment = await Appointment.findOne({
      tenantId: session.user.tenant.id,
      doctorId,
      appointmentDate: { $gte: dateStart, $lte: dateEnd },
      startTime,
      status: { $nin: ["cancelled", "no-show"] },
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: "Doctor already has an appointment at this time" },
        { status: 400 }
      );
    }

    const appointmentId = await generateAppointmentId(session.user.tenant.id);

    const appointment = await Appointment.create({
      appointmentId,
      patientId,
      doctorId,
      appointmentDate: appointmentDateObj,
      startTime,
      endTime,
      duration: duration || 30,
      type: type || "consultation",
      reason,
      notes,
      symptoms: symptoms || [],
      priority: priority || "normal",
      isFirstVisit: isFirstVisit || false,
      status: "scheduled",
      tenantId: session.user.tenant.id,
      createdBy: session.user.id,
    });

    const appointmentResponse = await Appointment.findById(appointment._id)
      .populate("patientId", "firstName lastName patientId phone email")
      .populate("doctorId", "name email")
      .populate("createdBy", "name");

    // Send confirmation email if enabled
    if (patient.email) {
      const emailEnabled = await isEmailEnabled(session.user.tenant.id, "appointmentConfirmationEmail");
      if (emailEnabled) {
        const populatedDoctor = appointmentResponse?.doctorId as { name?: string } | undefined;
        sendAppointmentConfirmationEmail({
          patientEmail: patient.email,
          patientName: `${patient.firstName} ${patient.lastName}`,
          clinicName: session.user.tenant.name,
          appointmentDate: format(appointmentDateObj, "MMMM dd, yyyy"),
          appointmentTime: startTime,
          doctorName: populatedDoctor?.name || "Doctor",
          appointmentType: type || "consultation",
          reason,
        }).catch((err) => console.error("Failed to send appointment confirmation email:", err));
      }
    }

    return NextResponse.json(
      { success: true, data: appointmentResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
