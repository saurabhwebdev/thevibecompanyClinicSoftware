import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import MedicalRecord from "@/models/MedicalRecord";
import Patient from "@/models/Patient";
import { sendMedicalRecordEmail } from "@/lib/email";
import { format } from "date-fns";

// GET all medical records (with optional patient filter)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "medical-records" && p.actions.includes("read")
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

    const [records, total] = await Promise.all([
      MedicalRecord.find(query)
        .sort({ visitDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate("patientId", "firstName lastName patientId")
        .populate("doctorId", "name"),
      MedicalRecord.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get medical records error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical records" },
      { status: 500 }
    );
  }
}

// POST create a new medical record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "medical-records" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      patientId,
      visitDate,
      visitType,
      chiefComplaint,
      presentIllness,
      vitalSigns,
      examination,
      diagnosis,
      differentialDiagnosis,
      treatmentPlan,
      procedures,
      labOrdersRequested,
      imagingOrdersRequested,
      referrals,
      followUpDate,
      followUpInstructions,
      notes,
    } = body;

    if (!patientId || !chiefComplaint || !diagnosis || diagnosis.length === 0) {
      return NextResponse.json(
        { error: "Patient ID, chief complaint, and at least one diagnosis are required" },
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

    const record = await MedicalRecord.create({
      patientId,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      visitType: visitType || "consultation",
      chiefComplaint,
      presentIllness,
      vitalSigns,
      examination,
      diagnosis,
      differentialDiagnosis,
      treatmentPlan,
      procedures,
      labOrdersRequested,
      imagingOrdersRequested,
      referrals,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      followUpInstructions,
      notes,
      doctorId: session.user.id,
      tenantId: session.user.tenant.id,
    });

    const recordResponse = await MedicalRecord.findById(record._id)
      .populate("patientId", "firstName lastName patientId email")
      .populate("doctorId", "name");

    // Send medical record summary email if patient has email
    if (patient.email) {
      sendMedicalRecordEmail({
        patientEmail: patient.email,
        patientName: `${patient.firstName} ${patient.lastName}`,
        clinicName: session.user.tenant.name,
        visitDate: format(record.visitDate, "MMM dd, yyyy"),
        visitType: record.visitType,
        doctorName: session.user.name || "Doctor",
        diagnosis: diagnosis,
        treatmentPlan: treatmentPlan,
        followUpDate: followUpDate ? format(new Date(followUpDate), "MMM dd, yyyy") : undefined,
        followUpInstructions: followUpInstructions,
      }).catch((err) => console.error("Failed to send medical record email:", err));
    }

    return NextResponse.json(
      { success: true, data: recordResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create medical record error:", error);
    return NextResponse.json(
      { error: "Failed to create medical record" },
      { status: 500 }
    );
  }
}
