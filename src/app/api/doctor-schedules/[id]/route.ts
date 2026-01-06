import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { DoctorSchedule, Appointment } from "@/models";

// GET single doctor schedule with available slots for a date
// The id param can be either the schedule's _id or the doctorId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // Optional: get available slots for a specific date

    await dbConnect();

    // Try to find by doctorId first (most common case from appointments page)
    let schedule = await DoctorSchedule.findOne({
      doctorId: id,
      tenantId: session.user.tenant.id,
    }).populate("doctorId", "name email isActive");

    // If not found, try by schedule _id
    if (!schedule) {
      schedule = await DoctorSchedule.findOne({
        _id: id,
        tenantId: session.user.tenant.id,
      }).populate("doctorId", "name email isActive");
    }

    if (!schedule) {
      // Return empty slots instead of 404 when no schedule exists for a doctor
      // This allows the appointments page to fall back to default time slots
      return NextResponse.json({
        success: true,
        data: {
          availableSlots: [],
          slotDuration: 30,
          message: "No schedule configured for this doctor",
        },
      });
    }

    // If date is provided, calculate available slots
    if (date) {
      const availableSlots = await getAvailableSlotsForDate(
        schedule,
        new Date(date),
        session.user.tenant.id
      );
      return NextResponse.json({
        success: true,
        data: { ...schedule.toObject(), availableSlots },
      });
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error("Get doctor schedule error:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctor schedule" },
      { status: 500 }
    );
  }
}

// PUT update doctor schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can manage schedules
    if (session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await dbConnect();

    const schedule = await DoctorSchedule.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Update fields
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
        (schedule as Record<string, unknown>)[field] = body[field];
      }
    }

    await schedule.save();

    const updatedSchedule = await DoctorSchedule.findById(id)
      .populate("doctorId", "name email isActive");

    return NextResponse.json({ success: true, data: updatedSchedule });
  } catch (error) {
    console.error("Update doctor schedule error:", error);
    return NextResponse.json(
      { error: "Failed to update doctor schedule" },
      { status: 500 }
    );
  }
}

// DELETE doctor schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can delete schedules
    if (session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    await dbConnect();

    const schedule = await DoctorSchedule.findOneAndDelete({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    console.error("Delete doctor schedule error:", error);
    return NextResponse.json(
      { error: "Failed to delete doctor schedule" },
      { status: 500 }
    );
  }
}

// Helper function to get available slots for a specific date
async function getAvailableSlotsForDate(
  schedule: InstanceType<typeof DoctorSchedule>,
  date: Date,
  tenantId: string
): Promise<string[]> {
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  // Find the day's schedule
  const daySchedule = schedule.weeklySchedule.find((d) => d.day === dayOfWeek);

  if (!daySchedule || !daySchedule.isWorking || daySchedule.slots.length === 0) {
    return [];
  }

  // Check if it's a leave date
  const isLeaveDate = schedule.leaveDates.some((leave) => {
    const leaveDate = new Date(leave.date);
    return (
      leaveDate.getFullYear() === date.getFullYear() &&
      leaveDate.getMonth() === date.getMonth() &&
      leaveDate.getDate() === date.getDate()
    );
  });

  if (isLeaveDate) {
    return [];
  }

  // Generate all possible slots based on schedule
  const allSlots: string[] = [];
  const slotDuration = schedule.slotDuration;
  const bufferTime = schedule.bufferTime;

  for (const slot of daySchedule.slots) {
    const [startHour, startMin] = slot.startTime.split(":").map(Number);
    const [endHour, endMin] = slot.endTime.split(":").map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + slotDuration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      allSlots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
      currentMinutes += slotDuration + bufferTime;
    }
  }

  // Get booked appointments for this doctor on this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await Appointment.find({
    tenantId,
    doctorId: schedule.doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ["cancelled", "no-show"] },
  }).select("startTime");

  const bookedTimes = bookedAppointments.map((apt) => apt.startTime);

  // Filter out booked slots (considering maxPatientsPerSlot)
  const slotCounts: Record<string, number> = {};
  bookedTimes.forEach((time) => {
    slotCounts[time] = (slotCounts[time] || 0) + 1;
  });

  const availableSlots = allSlots.filter((slot) => {
    const count = slotCounts[slot] || 0;
    return count < schedule.maxPatientsPerSlot;
  });

  return availableSlots;
}
