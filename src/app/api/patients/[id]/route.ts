import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Patient from "@/models/Patient";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET a single patient
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "patients" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await dbConnect();

    const patient = await Patient.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    }).populate("createdBy", "name");

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: patient });
  } catch (error) {
    console.error("Get patient error:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}

// PUT update a patient
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "patients" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    await dbConnect();

    const patient = await Patient.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Update fields
    const updateableFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "gender",
      "bloodGroup",
      "address",
      "allergies",
      "chronicConditions",
      "currentMedications",
      "insuranceProvider",
      "insurancePolicyNumber",
      "notes",
      "isActive",
    ];

    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        if (field === "email" && body[field]) {
          (patient as unknown as Record<string, unknown>)[field] = body[field].toLowerCase();
        } else if (field === "dateOfBirth" && body[field]) {
          (patient as unknown as Record<string, unknown>)[field] = new Date(body[field]);
        } else {
          (patient as unknown as Record<string, unknown>)[field] = body[field];
        }
      }
    });

    // Handle emergencyContact separately - only set if all required fields are provided
    if (body.emergencyContact !== undefined) {
      const { name, relationship, phone } = body.emergencyContact;
      if (name && relationship && phone) {
        patient.emergencyContact = body.emergencyContact;
      } else {
        patient.emergencyContact = undefined;
      }
    }

    await patient.save();

    const patientResponse = await Patient.findById(id)
      .populate("createdBy", "name");

    return NextResponse.json({ success: true, data: patientResponse });
  } catch (error) {
    console.error("Update patient error:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
}

// DELETE a patient
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "patients" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await dbConnect();

    const patient = await Patient.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    await Patient.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    console.error("Delete patient error:", error);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}
