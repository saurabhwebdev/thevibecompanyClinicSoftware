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

// GET a single prescription
export async function GET(request: NextRequest, context: RouteContext) {
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
      .populate("patientId", "firstName lastName patientId phone email dateOfBirth gender address")
      .populate("doctorId", "name email")
      .populate("medicalRecordId", "visitDate chiefComplaint");

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: prescription });
  } catch (error) {
    console.error("Get prescription error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescription" },
      { status: 500 }
    );
  }
}

// PUT update a prescription
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "prescriptions" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    await dbConnect();

    const prescription = await Prescription.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    // Update fields
    const updateableFields = [
      "medications",
      "diagnosis",
      "notes",
      "validUntil",
      "isDispensed",
      "dispensedDate",
      "dispensedBy",
      "pharmacyNotes",
    ];

    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        if (field === "validUntil" && body[field]) {
          (prescription as unknown as Record<string, unknown>)[field] = new Date(body[field]);
        } else if (field === "dispensedDate" && body[field]) {
          (prescription as unknown as Record<string, unknown>)[field] = new Date(body[field]);
        } else if (field === "isDispensed" && body[field] === true && !prescription.isDispensed) {
          // When marking as dispensed, set dispensed date and user
          prescription.isDispensed = true;
          prescription.dispensedDate = new Date();
          prescription.dispensedBy = session.user.id;
        } else {
          (prescription as unknown as Record<string, unknown>)[field] = body[field];
        }
      }
    });

    await prescription.save();

    const prescriptionResponse = await Prescription.findById(id)
      .populate("patientId", "firstName lastName patientId phone email")
      .populate("doctorId", "name email")
      .populate("medicalRecordId", "visitDate chiefComplaint")
      .populate("dispensedBy", "name");

    return NextResponse.json({ success: true, data: prescriptionResponse });
  } catch (error) {
    console.error("Update prescription error:", error);
    return NextResponse.json(
      { error: "Failed to update prescription" },
      { status: 500 }
    );
  }
}

// DELETE a prescription
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "prescriptions" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await dbConnect();

    const prescription = await Prescription.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    await Prescription.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Prescription deleted successfully",
    });
  } catch (error) {
    console.error("Delete prescription error:", error);
    return NextResponse.json(
      { error: "Failed to delete prescription" },
      { status: 500 }
    );
  }
}
