import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Prescription from "@/models/Prescription";
import { sendPrescriptionEmail, isEmailEnabled } from "@/lib/email";
import { format } from "date-fns";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST send prescription email
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "prescriptions" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await dbConnect();

    const prescription = await Prescription.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .populate("patientId", "firstName lastName patientId email")
      .populate("doctorId", "name");

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    const patient = prescription.patientId as {
      firstName: string;
      lastName: string;
      email?: string;
    };

    if (!patient.email) {
      return NextResponse.json(
        { error: "Patient does not have an email address" },
        { status: 400 }
      );
    }

    // Check if prescription emails are enabled
    const emailEnabled = await isEmailEnabled(session.user.tenant.id, "prescriptionEmail");
    if (!emailEnabled) {
      return NextResponse.json(
        { error: "Prescription emails are disabled in settings" },
        { status: 400 }
      );
    }

    const doctor = prescription.doctorId as { name: string };

    // Send prescription email
    await sendPrescriptionEmail({
      patientEmail: patient.email,
      patientName: `${patient.firstName} ${patient.lastName}`,
      prescriptionId: prescription.prescriptionId,
      doctorName: doctor.name,
      clinicName: session.user.tenant.name,
      prescriptionDate: format(prescription.prescriptionDate, "MMM dd, yyyy"),
      medications: prescription.medications.map((med) => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
      })),
      diagnosis: prescription.diagnosis,
      notes: prescription.notes,
    });

    return NextResponse.json({
      success: true,
      message: "Prescription email sent successfully",
    });
  } catch (error) {
    console.error("Send prescription email error:", error);
    return NextResponse.json(
      { error: "Failed to send prescription email" },
      { status: 500 }
    );
  }
}
