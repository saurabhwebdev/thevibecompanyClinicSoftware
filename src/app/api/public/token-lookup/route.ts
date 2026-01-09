import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Appointment from "@/models/Appointment";
import TaxConfig from "@/models/TaxConfig";

// GET - Lookup appointment by token or appointment ID (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const appointmentId = searchParams.get("appointmentId");
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Clinic slug is required" },
        { status: 400 }
      );
    }

    if (!token && !appointmentId) {
      return NextResponse.json(
        { error: "Token or appointment ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the tenant by booking slug
    const taxConfig = await TaxConfig.findOne({
      "settings.bookingSlug": slug,
      isActive: true,
    });

    if (!taxConfig) {
      return NextResponse.json(
        { error: "Clinic not found" },
        { status: 404 }
      );
    }

    const tenantId = taxConfig.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build query
    const query: Record<string, unknown> = {
      tenantId,
      appointmentDate: { $gte: today, $lt: tomorrow },
    };

    if (token) {
      query.tokenDisplayNumber = token.toUpperCase();
    } else if (appointmentId) {
      query.appointmentId = appointmentId;
    }

    interface PopulatedPatient {
      firstName?: string;
      lastName?: string;
    }

    interface PopulatedDoctor {
      name?: string;
    }

    const appointment = await Appointment.findOne(query)
      .populate("patientId", "firstName lastName")
      .populate("doctorId", "name")
      .select(
        "appointmentId tokenNumber tokenDisplayNumber status appointmentDate startTime patientId doctorId estimatedWaitMinutes checkedInAt"
      )
      .lean();

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const patient = appointment.patientId as unknown as PopulatedPatient;
    const doctor = appointment.doctorId as unknown as PopulatedDoctor;

    // Get queue position if checked in
    let queuePosition = null;
    if (appointment.tokenNumber && appointment.status === "checked-in") {
      const aheadCount = await Appointment.countDocuments({
        tenantId,
        appointmentDate: { $gte: today, $lt: tomorrow },
        tokenNumber: { $lt: appointment.tokenNumber, $ne: null },
        status: "checked-in",
      });
      queuePosition = aheadCount + 1;
    }

    // Get current serving token
    const currentServing = await Appointment.findOne({
      tenantId,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: "in-progress",
      tokenNumber: { $ne: null },
    })
      .select("tokenDisplayNumber")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        appointmentId: appointment.appointmentId,
        tokenNumber: appointment.tokenNumber,
        tokenDisplayNumber: appointment.tokenDisplayNumber,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        patientName: `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim(),
        doctorName: doctor?.name || "",
        estimatedWaitMinutes: appointment.estimatedWaitMinutes,
        checkedInAt: appointment.checkedInAt,
        queuePosition,
        currentServingToken: currentServing?.tokenDisplayNumber || null,
      },
    });
  } catch (error) {
    console.error("Token lookup error:", error);
    return NextResponse.json(
      { error: "Failed to lookup token" },
      { status: 500 }
    );
  }
}
