import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import MedicalRecord from "@/models/MedicalRecord";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET a single medical record
export async function GET(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    await dbConnect();

    const record = await MedicalRecord.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .populate("patientId", "firstName lastName patientId dateOfBirth gender phone email")
      .populate("doctorId", "name");

    if (!record) {
      return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("Get medical record error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical record" },
      { status: 500 }
    );
  }
}

// PUT update a medical record
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "medical-records" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    await dbConnect();

    const record = await MedicalRecord.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!record) {
      return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    }

    const updateableFields = [
      "visitDate",
      "visitType",
      "chiefComplaint",
      "presentIllness",
      "vitalSigns",
      "examination",
      "diagnosis",
      "differentialDiagnosis",
      "treatmentPlan",
      "procedures",
      "labOrdersRequested",
      "imagingOrdersRequested",
      "referrals",
      "followUpDate",
      "followUpInstructions",
      "notes",
    ];

    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        if ((field === "visitDate" || field === "followUpDate") && body[field]) {
          (record as unknown as Record<string, unknown>)[field] = new Date(body[field]);
        } else {
          (record as unknown as Record<string, unknown>)[field] = body[field];
        }
      }
    });

    await record.save();

    const recordResponse = await MedicalRecord.findById(id)
      .populate("patientId", "firstName lastName patientId")
      .populate("doctorId", "name");

    return NextResponse.json({ success: true, data: recordResponse });
  } catch (error) {
    console.error("Update medical record error:", error);
    return NextResponse.json(
      { error: "Failed to update medical record" },
      { status: 500 }
    );
  }
}

// DELETE a medical record
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "medical-records" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await dbConnect();

    const record = await MedicalRecord.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!record) {
      return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    }

    await MedicalRecord.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Medical record deleted successfully",
    });
  } catch (error) {
    console.error("Delete medical record error:", error);
    return NextResponse.json(
      { error: "Failed to delete medical record" },
      { status: 500 }
    );
  }
}
