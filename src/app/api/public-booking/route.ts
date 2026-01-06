import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { Tenant, DoctorSchedule, User, Appointment, Patient, Role } from "@/models";

// Generate unique patient ID
async function generatePatientId(tenantId: string): Promise<string> {
  const count = await Patient.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `PAT${paddedNumber}`;
}

// Generate unique appointment ID
async function generateAppointmentId(tenantId: string): Promise<string> {
  const count = await Appointment.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `APT${paddedNumber}`;
}

// Split full name into first and last name
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  const lastName = parts.pop() || "";
  const firstName = parts.join(" ");
  return { firstName, lastName };
}

// GET clinic info and doctors for public booking (unauthenticated)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Booking slug is required" },
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

    // Get doctors with online booking enabled
    const doctorSchedules = await DoctorSchedule.find({
      tenantId: tenant._id,
      acceptsOnlineBooking: true,
      isAcceptingAppointments: true,
    }).populate("doctorId", "name email");

    // Filter out schedules where doctor is inactive or doesn't exist
    const activeDoctors = doctorSchedules.filter(
      (schedule) => schedule.doctorId && (schedule.doctorId as { isActive?: boolean }).isActive !== false
    );

    // Format doctor data
    const doctors = activeDoctors.map((schedule) => {
      const doctor = schedule.doctorId as { _id: string; name: string; email: string };
      return {
        id: doctor._id,
        name: doctor.name,
        specialization: schedule.specialization,
        qualifications: schedule.qualifications,
        bio: schedule.bio,
        consultationFee: tenant.publicBookingSettings.showDoctorFees
          ? schedule.consultationFee
          : undefined,
        slotDuration: schedule.slotDuration,
        advanceBookingDays: schedule.advanceBookingDays,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        clinic: {
          name: tenant.publicBookingSettings.clinicName || tenant.name,
          description: tenant.publicBookingSettings.clinicDescription,
          address: tenant.publicBookingSettings.clinicAddress,
          phone: tenant.publicBookingSettings.clinicPhone,
          email: tenant.publicBookingSettings.clinicEmail,
          logo: tenant.publicBookingSettings.clinicLogo,
          termsAndConditions: tenant.publicBookingSettings.termsAndConditions,
          cancellationPolicy: tenant.publicBookingSettings.cancellationPolicy,
          requirePhoneNumber: tenant.publicBookingSettings.requirePhoneNumber,
          requireEmail: tenant.publicBookingSettings.requireEmail,
          captchaEnabled: tenant.publicBookingSettings.captchaEnabled || false,
          captchaSiteKey: tenant.publicBookingSettings.captchaEnabled
            ? tenant.publicBookingSettings.captchaSiteKey
            : undefined,
        },
        doctors,
      },
    });
  } catch (error) {
    console.error("Get public booking info error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clinic information" },
      { status: 500 }
    );
  }
}

// Verify Friendly Captcha token
async function verifyCaptcha(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.friendlycaptcha.com/api/v1/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        solution: token,
        secret: secretKey,
      }),
    });
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// POST create a public booking (unauthenticated)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slug,
      doctorId,
      date,
      time,
      patientName,
      patientEmail,
      patientPhone,
      notes,
      agreedToTerms,
      captchaToken,
    } = body;

    if (!slug || !doctorId || !date || !time || !patientName) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Verify CAPTCHA if enabled
    if (tenant.publicBookingSettings.captchaEnabled) {
      if (!captchaToken) {
        return NextResponse.json(
          { error: "Please complete the CAPTCHA verification" },
          { status: 400 }
        );
      }

      const secretKey = tenant.publicBookingSettings.captchaSecretKey;
      if (!secretKey) {
        return NextResponse.json(
          { error: "CAPTCHA is not configured properly" },
          { status: 500 }
        );
      }

      const isValidCaptcha = await verifyCaptcha(captchaToken, secretKey);
      if (!isValidCaptcha) {
        return NextResponse.json(
          { error: "CAPTCHA verification failed. Please try again." },
          { status: 400 }
        );
      }
    }

    // Validate required fields based on tenant settings
    if (tenant.publicBookingSettings.requireEmail && !patientEmail) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (tenant.publicBookingSettings.requirePhoneNumber && !patientPhone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (tenant.publicBookingSettings.termsAndConditions && !agreedToTerms) {
      return NextResponse.json(
        { error: "You must agree to the terms and conditions" },
        { status: 400 }
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

    // Validate appointment date and time
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return NextResponse.json(
        { error: "Cannot book appointments in the past" },
        { status: 400 }
      );
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + schedule.advanceBookingDays);
    if (appointmentDate > maxDate) {
      return NextResponse.json(
        { error: `Cannot book more than ${schedule.advanceBookingDays} days in advance` },
        { status: 400 }
      );
    }

    // Check if slot is available
    const dayOfWeek = appointmentDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const daySchedule = schedule.weeklySchedule.find((d) => d.day === dayOfWeek);

    if (!daySchedule || !daySchedule.isWorking) {
      return NextResponse.json(
        { error: "Doctor is not available on this day" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Doctor is on leave on this date" },
        { status: 400 }
      );
    }

    // Check for existing bookings
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Appointment.countDocuments({
      tenantId: tenant._id,
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      startTime: time,
      status: { $nin: ["cancelled", "no-show"] },
    });

    if (existingBookings >= schedule.maxPatientsPerSlot) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 400 }
      );
    }

    // Get an admin user to be the creator (for audit purposes)
    const adminRole = await Role.findOne({ tenantId: tenant._id, name: "Admin" });
    let createdByUser = null;

    if (adminRole) {
      createdByUser = await User.findOne({ tenantId: tenant._id, roleId: adminRole._id, isActive: true });
    }

    // If no admin, find any active user
    if (!createdByUser) {
      createdByUser = await User.findOne({ tenantId: tenant._id, isActive: true });
    }

    if (!createdByUser) {
      return NextResponse.json(
        { error: "System error: No staff found to process booking" },
        { status: 500 }
      );
    }

    // Find or create patient
    let patient = await Patient.findOne({
      tenantId: tenant._id,
      $or: [
        ...(patientEmail ? [{ email: patientEmail.toLowerCase() }] : []),
        ...(patientPhone ? [{ phone: patientPhone }] : []),
      ],
    });

    if (!patient) {
      // Split patient name into first and last name
      const { firstName, lastName } = splitName(patientName);

      // Generate unique patient ID
      const newPatientId = await generatePatientId(tenant._id.toString());

      patient = await Patient.create({
        tenantId: tenant._id,
        patientId: newPatientId,
        firstName,
        lastName,
        email: patientEmail?.toLowerCase(),
        phone: patientPhone || "N/A", // Phone is required in the model
        dateOfBirth: new Date("1990-01-01"), // Default DOB for online bookings
        gender: "other",
        createdBy: createdByUser._id,
        notes: "Created via online booking",
      });
    }

    // Calculate end time
    const [hours, minutes] = time.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + schedule.slotDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

    // Generate appointment ID
    const newAppointmentId = await generateAppointmentId(tenant._id.toString());

    // Create appointment
    const appointment = await Appointment.create({
      tenantId: tenant._id,
      appointmentId: newAppointmentId,
      patientId: patient._id,
      doctorId,
      appointmentDate,
      startTime: time,
      endTime,
      duration: schedule.slotDuration,
      type: "consultation",
      status: "scheduled",
      reason: notes || "Online booking",
      notes: "Booked via public online booking page",
      createdBy: createdByUser._id,
    });

    return NextResponse.json({
      success: true,
      data: {
        appointmentId: appointment._id,
        confirmationMessage: tenant.publicBookingSettings.confirmationMessage ||
          "Your appointment has been booked successfully. We look forward to seeing you!",
        appointment: {
          date: appointmentDate.toISOString().split("T")[0],
          time,
          endTime,
          duration: schedule.slotDuration,
        },
      },
    });
  } catch (error) {
    console.error("Create public booking error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
