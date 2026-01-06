import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { Tenant, DoctorSchedule, Appointment } from "@/models";

// GET available slots for a doctor on a specific date (unauthenticated)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");

    if (!slug || !doctorId || !date) {
      return NextResponse.json(
        { error: "Slug, doctor ID, and date are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find tenant by booking slug
    const tenant = await Tenant.findOne({
      "publicBookingSettings.bookingSlug": slug.toLowerCase(),
      "publicBookingSettings.isEnabled": true,
      isActive: true,
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Clinic not found or public booking is disabled" },
        { status: 404 }
      );
    }

    // Get doctor schedule
    const schedule = await DoctorSchedule.findOne({
      doctorId,
      tenantId: tenant._id,
      acceptsOnlineBooking: true,
      isAcceptingAppointments: true,
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Doctor is not accepting online appointments" },
        { status: 400 }
      );
    }

    const appointmentDate = new Date(date);

    // Validate date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          availableSlots: [],
          message: "Cannot book appointments in the past",
        },
      });
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + schedule.advanceBookingDays);
    if (appointmentDate > maxDate) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          availableSlots: [],
          message: `Cannot book more than ${schedule.advanceBookingDays} days in advance`,
        },
      });
    }

    // Check day schedule
    const dayOfWeek = appointmentDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const daySchedule = schedule.weeklySchedule.find((d) => d.day === dayOfWeek);

    if (!daySchedule || !daySchedule.isWorking || daySchedule.slots.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          availableSlots: [],
          message: "Doctor is not available on this day",
        },
      });
    }

    // Check if it's a leave date
    const isLeaveDate = schedule.leaveDates.some((leave) => {
      const leaveDate = new Date(leave.date);
      return (
        leaveDate.getFullYear() === appointmentDate.getFullYear() &&
        leaveDate.getMonth() === appointmentDate.getMonth() &&
        leaveDate.getDate() === appointmentDate.getDate()
      );
    });

    if (isLeaveDate) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          availableSlots: [],
          message: "Doctor is on leave on this date",
        },
      });
    }

    // Generate all possible slots
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

    // Get booked appointments
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      tenantId: tenant._id,
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "no-show"] },
    }).select("startTime");

    // Count bookings per slot
    const slotCounts: Record<string, number> = {};
    bookedAppointments.forEach((apt) => {
      slotCounts[apt.startTime] = (slotCounts[apt.startTime] || 0) + 1;
    });

    // Filter available slots (considering maxPatientsPerSlot)
    const availableSlots = allSlots.filter((slot) => {
      const count = slotCounts[slot] || 0;
      return count < schedule.maxPatientsPerSlot;
    });

    // If it's today, filter out past time slots
    const isToday =
      appointmentDate.getFullYear() === today.getFullYear() &&
      appointmentDate.getMonth() === today.getMonth() &&
      appointmentDate.getDate() === today.getDate();

    let filteredSlots = availableSlots;
    if (isToday) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      filteredSlots = availableSlots.filter((slot) => {
        const [hours, mins] = slot.split(":").map(Number);
        return hours * 60 + mins > currentMinutes + 30; // At least 30 minutes from now
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        availableSlots: filteredSlots,
        slotDuration: schedule.slotDuration,
      },
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
