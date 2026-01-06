import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { DoctorSchedule, User, Role } from "@/models";

// GET all doctor schedules for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const onlineOnly = searchParams.get("onlineOnly") === "true";

    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (doctorId) {
      query.doctorId = doctorId;
    }

    if (onlineOnly) {
      query.acceptsOnlineBooking = true;
      query.isAcceptingAppointments = true;
    }

    const schedules = await DoctorSchedule.find(query)
      .populate("doctorId", "name email isActive")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    console.error("Get doctor schedules error:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctor schedules" },
      { status: 500 }
    );
  }
}

// POST create or update doctor schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can manage schedules
    if (session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { doctorId } = body;

    if (!doctorId) {
      return NextResponse.json(
        { error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify the doctor exists and belongs to this tenant
    const doctor = await User.findOne({
      _id: doctorId,
      tenantId: session.user.tenant.id,
      isActive: true,
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    // Verify user has a Doctor role
    const doctorRole = await Role.findOne({
      _id: doctor.roleId,
      name: { $regex: /doctor/i },
    });

    if (!doctorRole) {
      return NextResponse.json(
        { error: "User is not a doctor" },
        { status: 400 }
      );
    }

    // Check if schedule already exists for this doctor
    const existingSchedule = await DoctorSchedule.findOne({
      doctorId,
      tenantId: session.user.tenant.id,
    });

    let schedule;

    if (existingSchedule) {
      // Update existing schedule
      const updateFields = [
        "weeklySchedule",
        "slotDuration",
        "bufferTime",
        "maxPatientsPerSlot",
        "advanceBookingDays",
        "isAcceptingAppointments",
        "acceptsOnlineBooking",
        "consultationFee",
        "specialization",
        "qualifications",
        "bio",
        "leaveDates",
      ];

      for (const field of updateFields) {
        if (body[field] !== undefined) {
          (existingSchedule as any)[field] = body[field];
        }
      }

      schedule = await existingSchedule.save();
    } else {
      // Create new schedule
      schedule = await DoctorSchedule.create({
        doctorId,
        tenantId: session.user.tenant.id,
        weeklySchedule: body.weeklySchedule,
        slotDuration: body.slotDuration || 30,
        bufferTime: body.bufferTime || 0,
        maxPatientsPerSlot: body.maxPatientsPerSlot || 1,
        advanceBookingDays: body.advanceBookingDays || 30,
        isAcceptingAppointments: body.isAcceptingAppointments !== false,
        acceptsOnlineBooking: body.acceptsOnlineBooking || false,
        consultationFee: body.consultationFee || 0,
        specialization: body.specialization,
        qualifications: body.qualifications,
        bio: body.bio,
        leaveDates: body.leaveDates || [],
      });
    }

    const populatedSchedule = await DoctorSchedule.findById(schedule._id)
      .populate("doctorId", "name email isActive");

    return NextResponse.json(
      { success: true, data: populatedSchedule },
      { status: existingSchedule ? 200 : 201 }
    );
  } catch (error) {
    console.error("Create/update doctor schedule error:", error);
    return NextResponse.json(
      { error: "Failed to save doctor schedule" },
      { status: 500 }
    );
  }
}
