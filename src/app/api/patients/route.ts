import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Patient from "@/models/Patient";
import { sendPatientWelcomeEmail, isEmailEnabled } from "@/lib/email";

// Generate unique patient ID
async function generatePatientId(tenantId: string): Promise<string> {
  const count = await Patient.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `PAT${paddedNumber}`;
}

// GET all patients for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "patients" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // Get query parameters for search and filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name"),
      Patient.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get patients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

// POST create a new patient
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "patients" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicConditions,
      currentMedications,
      insuranceProvider,
      insurancePolicyNumber,
      notes,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: "First name, last name, phone, date of birth, and gender are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Generate patient ID
    const patientId = await generatePatientId(session.user.tenant.id);

    // Create patient
    const patient = await Patient.create({
      patientId,
      firstName,
      lastName,
      email: email?.toLowerCase(),
      phone,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
      currentMedications: currentMedications || [],
      insuranceProvider,
      insurancePolicyNumber,
      notes,
      tenantId: session.user.tenant.id,
      createdBy: session.user.id,
    });

    const patientResponse = await Patient.findById(patient._id)
      .populate("createdBy", "name");

    // Send welcome email if patient has email and email is enabled
    if (patient.email) {
      const emailEnabled = await isEmailEnabled(session.user.tenant.id, "patientWelcomeEmail");
      if (emailEnabled) {
        sendPatientWelcomeEmail(
          patient.email,
          `${patient.firstName} ${patient.lastName}`,
          patient.patientId,
          session.user.tenant.name
        ).catch((err) => console.error("Failed to send patient welcome email:", err));
      }
    }

    return NextResponse.json(
      { success: true, data: patientResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create patient error:", error);
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
