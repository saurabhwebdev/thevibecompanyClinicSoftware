import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { User, Role, DoctorSchedule, Tenant } from "@/models";

// Seed doctor schedules with online booking enabled
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const tenantId = session.user.tenant.id;

    // Find all users with Doctor role
    const doctorRoles = await Role.find({
      tenantId,
      name: { $regex: /doctor/i },
    });

    if (doctorRoles.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No Doctor role found. Please create a Doctor role first.",
      });
    }

    const doctorRoleIds = doctorRoles.map((r) => r._id);

    const doctors = await User.find({
      tenantId,
      roleId: { $in: doctorRoleIds },
      isActive: true,
    });

    if (doctors.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No doctors found. Please create users with Doctor role first.",
      });
    }

    let createdCount = 0;
    let existingCount = 0;

    for (const doctor of doctors) {
      // Check if schedule already exists
      const existingSchedule = await DoctorSchedule.findOne({
        doctorId: doctor._id,
        tenantId,
      });

      if (existingSchedule) {
        // Update to enable online booking if not already enabled
        if (!existingSchedule.acceptsOnlineBooking) {
          existingSchedule.acceptsOnlineBooking = true;
          existingSchedule.isAcceptingAppointments = true;
          await existingSchedule.save();
        }
        existingCount++;
        continue;
      }

      // Create new schedule with online booking enabled
      await DoctorSchedule.create({
        doctorId: doctor._id,
        tenantId,
        weeklySchedule: [
          {
            day: "monday",
            isWorking: true,
            slots: [
              { startTime: "09:00", endTime: "13:00" },
              { startTime: "14:00", endTime: "18:00" },
            ],
          },
          {
            day: "tuesday",
            isWorking: true,
            slots: [
              { startTime: "09:00", endTime: "13:00" },
              { startTime: "14:00", endTime: "18:00" },
            ],
          },
          {
            day: "wednesday",
            isWorking: true,
            slots: [
              { startTime: "09:00", endTime: "13:00" },
              { startTime: "14:00", endTime: "18:00" },
            ],
          },
          {
            day: "thursday",
            isWorking: true,
            slots: [
              { startTime: "09:00", endTime: "13:00" },
              { startTime: "14:00", endTime: "18:00" },
            ],
          },
          {
            day: "friday",
            isWorking: true,
            slots: [
              { startTime: "09:00", endTime: "13:00" },
              { startTime: "14:00", endTime: "18:00" },
            ],
          },
          {
            day: "saturday",
            isWorking: true,
            slots: [{ startTime: "09:00", endTime: "13:00" }],
          },
          { day: "sunday", isWorking: false, slots: [] },
        ],
        slotDuration: 30,
        bufferTime: 5,
        maxPatientsPerSlot: 1,
        advanceBookingDays: 30,
        isAcceptingAppointments: true,
        acceptsOnlineBooking: true, // Enable online booking
        consultationFee: 500,
        specialization: "General Medicine",
        qualifications: "MBBS, MD",
        bio: `Dr. ${doctor.name} is an experienced physician providing comprehensive healthcare services.`,
        leaveDates: [],
      });

      createdCount++;
    }

    // Also update tenant public booking settings if not enabled
    const tenant = await Tenant.findById(tenantId);
    if (tenant && !tenant.publicBookingSettings?.isEnabled) {
      if (!tenant.publicBookingSettings) {
        tenant.publicBookingSettings = {
          isEnabled: true,
          bookingSlug: tenant.slug || "clinic",
          clinicName: tenant.name,
          requirePhoneNumber: true,
          requireEmail: true,
          showDoctorFees: true,
          captchaEnabled: false,
        };
      } else {
        tenant.publicBookingSettings.isEnabled = true;
        tenant.publicBookingSettings.bookingSlug = tenant.publicBookingSettings.bookingSlug || tenant.slug || "clinic";
      }
      await tenant.save();
    }

    return NextResponse.json({
      success: true,
      message: `Doctor schedules seeded. Created: ${createdCount}, Updated: ${existingCount}`,
      data: {
        doctorsFound: doctors.length,
        schedulesCreated: createdCount,
        schedulesUpdated: existingCount,
        bookingUrl: `/book/${tenant?.publicBookingSettings?.bookingSlug || tenant?.slug || "clinic"}`,
      },
    });
  } catch (error) {
    console.error("Seed doctor schedules error:", error);
    return NextResponse.json(
      { error: "Failed to seed doctor schedules" },
      { status: 500 }
    );
  }
}
