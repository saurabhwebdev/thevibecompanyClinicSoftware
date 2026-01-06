import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Types } from "mongoose";
import Appointment from "@/models/Appointment";
import Patient from "@/models/Patient";
import { sendAppointmentCancellationEmail, sendAppointmentRescheduleEmail, isEmailEnabled } from "@/lib/email";
import { format } from "date-fns";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET a single appointment
export async function GET(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    await dbConnect();

    const appointment = await Appointment.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .populate("patientId", "firstName lastName patientId phone email dateOfBirth gender")
      .populate("doctorId", "name email")
      .populate("createdBy", "name")
      .populate("cancelledBy", "name");

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: appointment });
  } catch (error) {
    console.error("Get appointment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

// PUT update an appointment
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "appointments" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    await dbConnect();

    const appointment = await Appointment.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const patient = await Patient.findById(appointment.patientId);
    const oldDate = appointment.appointmentDate;
    const oldTime = appointment.startTime;

    // Handle status changes
    if (body.status === "cancelled" && appointment.status !== "cancelled") {
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = new Types.ObjectId(session.user.id);
      appointment.cancellationReason = body.cancellationReason || "Cancelled by clinic";

      // Send cancellation email if enabled
      if (patient?.email) {
        const emailEnabled = await isEmailEnabled(session.user.tenant.id, "appointmentCancellationEmail");
        if (emailEnabled) {
          const doctor = await appointment.populate("doctorId", "name");
          const populatedDoctor = doctor.doctorId as { name?: string } | undefined;
          sendAppointmentCancellationEmail({
            patientEmail: patient.email,
            patientName: `${patient.firstName} ${patient.lastName}`,
            clinicName: session.user.tenant.name,
            appointmentDate: format(appointment.appointmentDate, "MMMM dd, yyyy"),
            appointmentTime: appointment.startTime,
            doctorName: populatedDoctor?.name || "Doctor",
            reason: body.cancellationReason || "Cancelled by clinic",
          }).catch((err) => console.error("Failed to send cancellation email:", err));
        }
      }
    }

    // Handle rescheduling
    const isRescheduled = body.appointmentDate && body.startTime &&
      (new Date(body.appointmentDate).toDateString() !== oldDate.toDateString() || body.startTime !== oldTime);

    // Update fields
    const updateableFields = [
      "appointmentDate",
      "startTime",
      "endTime",
      "duration",
      "type",
      "status",
      "reason",
      "notes",
      "symptoms",
      "priority",
      "isFirstVisit",
      "doctorId",
    ];

    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        if (field === "appointmentDate" && body[field]) {
          (appointment as unknown as Record<string, unknown>)[field] = new Date(body[field]);
        } else {
          (appointment as unknown as Record<string, unknown>)[field] = body[field];
        }
      }
    });

    await appointment.save();

    // Send reschedule email if date/time changed and email is enabled
    if (isRescheduled && patient?.email && appointment.status !== "cancelled") {
      const emailEnabled = await isEmailEnabled(session.user.tenant.id, "appointmentRescheduleEmail");
      if (emailEnabled) {
        const doctor = await appointment.populate("doctorId", "name");
        const populatedDoctor = doctor.doctorId as { name?: string } | undefined;
        sendAppointmentRescheduleEmail({
          patientEmail: patient.email,
          patientName: `${patient.firstName} ${patient.lastName}`,
          clinicName: session.user.tenant.name,
          oldDate: format(oldDate, "MMMM dd, yyyy"),
          oldTime: oldTime,
          newDate: format(appointment.appointmentDate, "MMMM dd, yyyy"),
          newTime: appointment.startTime,
          doctorName: populatedDoctor?.name || "Doctor",
        }).catch((err) => console.error("Failed to send reschedule email:", err));
      }
    }

    const appointmentResponse = await Appointment.findById(id)
      .populate("patientId", "firstName lastName patientId phone email")
      .populate("doctorId", "name email")
      .populate("createdBy", "name");

    return NextResponse.json({ success: true, data: appointmentResponse });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}

// DELETE an appointment
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "appointments" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await dbConnect();

    const appointment = await Appointment.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await Appointment.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }
}
