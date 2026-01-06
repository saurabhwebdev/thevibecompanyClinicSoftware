import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Prescription from "@/models/Prescription";
import Patient from "@/models/Patient";
import { sendPrescriptionEmail, isEmailEnabled } from "@/lib/email";
import { format } from "date-fns";

// Generate unique prescription ID
async function generatePrescriptionId(tenantId: string): Promise<string> {
  const count = await Prescription.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `RX${paddedNumber}`;
}

// GET all prescriptions (with optional patient filter)
export async function GET(request: NextRequest) {
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

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (patientId) {
      query.patientId = patientId;
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .sort({ prescriptionDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate("patientId", "firstName lastName patientId")
        .populate("doctorId", "name")
        .populate("medicalRecordId", "visitDate chiefComplaint"),
      Prescription.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get prescriptions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

// POST create a new prescription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "prescriptions" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      patientId,
      medicalRecordId,
      medications,
      prescriptionDate,
      validUntil,
      diagnosis,
      notes,
    } = body;

    if (!patientId || !medications || medications.length === 0) {
      return NextResponse.json(
        { error: "Patient ID and at least one medication are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify patient exists and belongs to tenant
    const patient = await Patient.findOne({
      _id: patientId,
      tenantId: session.user.tenant.id,
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Generate prescription ID
    const prescriptionId = await generatePrescriptionId(session.user.tenant.id);

    const prescription = await Prescription.create({
      prescriptionId,
      patientId,
      medicalRecordId,
      medications,
      prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      diagnosis,
      notes,
      doctorId: session.user.id,
      tenantId: session.user.tenant.id,
    });

    const prescriptionResponse = await Prescription.findById(prescription._id)
      .populate("patientId", "firstName lastName patientId email")
      .populate("doctorId", "name");

    // Send prescription email if patient has email and email is enabled
    if (patient.email) {
      const emailEnabled = await isEmailEnabled(session.user.tenant.id, "prescriptionEmail");
      if (emailEnabled) {
        sendPrescriptionEmail({
          patientEmail: patient.email,
          patientName: `${patient.firstName} ${patient.lastName}`,
          prescriptionId: prescription.prescriptionId,
          doctorName: session.user.name || "Doctor",
          clinicName: session.user.tenant.name,
          prescriptionDate: format(prescription.prescriptionDate, "MMM dd, yyyy"),
          medications: medications.map((med: { name: string; dosage: string; frequency: string; duration: string; instructions?: string }) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
          })),
          diagnosis: diagnosis,
          notes: notes,
        }).catch((err) => console.error("Failed to send prescription email:", err));
      }
    }

    return NextResponse.json(
      { success: true, data: prescriptionResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create prescription error:", error);
    return NextResponse.json(
      { error: "Failed to create prescription" },
      { status: 500 }
    );
  }
}
