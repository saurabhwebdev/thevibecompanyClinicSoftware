import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Tenant, TaxConfig } from "@/models";

// GET public booking settings for the tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const [tenant, taxConfig] = await Promise.all([
      Tenant.findById(session.user.tenant.id),
      TaxConfig.findOne({ tenantId: session.user.tenant.id }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get clinic info from tax config if available
    const clinicInfoFromTaxConfig = taxConfig ? {
      clinicName: taxConfig.tradeName || taxConfig.legalName || tenant.name,
      clinicAddress: taxConfig.address ?
        [taxConfig.address.line1, taxConfig.address.line2, taxConfig.address.city, taxConfig.address.state, taxConfig.address.postalCode]
          .filter(Boolean).join(", ") : "",
      clinicPhone: taxConfig.phone || "",
      clinicEmail: taxConfig.email || "",
    } : {
      clinicName: tenant.name,
      clinicAddress: "",
      clinicPhone: "",
      clinicEmail: "",
    };

    // Convert Mongoose subdocument to plain object
    const publicSettings = tenant.publicBookingSettings
      ? tenant.publicBookingSettings.toObject
        ? tenant.publicBookingSettings.toObject()
        : { ...tenant.publicBookingSettings }
      : {
          isEnabled: false,
          bookingSlug: "",
          requirePhoneNumber: true,
          requireEmail: true,
          showDoctorFees: true,
          captchaEnabled: false,
        };

    return NextResponse.json({
      success: true,
      data: {
        ...publicSettings,
        // Always override with tax config values
        clinicName: clinicInfoFromTaxConfig.clinicName,
        clinicAddress: clinicInfoFromTaxConfig.clinicAddress,
        clinicPhone: clinicInfoFromTaxConfig.clinicPhone,
        clinicEmail: clinicInfoFromTaxConfig.clinicEmail,
      },
      taxConfigExists: !!taxConfig,
    });
  } catch (error) {
    console.error("Get public booking settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch public booking settings" },
      { status: 500 }
    );
  }
}

// PUT update public booking settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can manage public booking settings
    if (session.user.role.name !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    await dbConnect();

    // If a booking slug is provided, check for uniqueness
    if (body.bookingSlug) {
      const existingTenant = await Tenant.findOne({
        _id: { $ne: session.user.tenant.id },
        "publicBookingSettings.bookingSlug": body.bookingSlug.toLowerCase(),
      });

      if (existingTenant) {
        return NextResponse.json(
          { error: "This booking URL is already in use. Please choose a different one." },
          { status: 400 }
        );
      }
    }

    const tenant = await Tenant.findById(session.user.tenant.id);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Update public booking settings
    const updateFields = [
      "isEnabled",
      "bookingSlug",
      "clinicDescription",
      "requirePhoneNumber",
      "requireEmail",
      "showDoctorFees",
      "confirmationMessage",
      "termsAndConditions",
      "cancellationPolicy",
      "captchaEnabled",
      "captchaSiteKey",
      "captchaSecretKey",
    ];

    // Initialize publicBookingSettings if it doesn't exist
    if (!tenant.publicBookingSettings) {
      tenant.publicBookingSettings = {
        isEnabled: false,
        bookingSlug: "",
        clinicName: tenant.name,
        requirePhoneNumber: true,
        requireEmail: true,
        showDoctorFees: true,
      };
    }

    for (const field of updateFields) {
      if (body[field] !== undefined) {
        (tenant.publicBookingSettings as Record<string, unknown>)[field] = body[field];
      }
    }

    // Mark the subdocument as modified so Mongoose saves it
    tenant.markModified("publicBookingSettings");

    await tenant.save();

    // Fetch the tax config to include clinic info in response
    const taxConfig = await TaxConfig.findOne({ tenantId: session.user.tenant.id });
    const clinicInfoFromTaxConfig = taxConfig ? {
      clinicName: taxConfig.tradeName || taxConfig.legalName || tenant.name,
      clinicAddress: taxConfig.address ?
        [taxConfig.address.line1, taxConfig.address.line2, taxConfig.address.city, taxConfig.address.state, taxConfig.address.postalCode]
          .filter(Boolean).join(", ") : "",
      clinicPhone: taxConfig.phone || "",
      clinicEmail: taxConfig.email || "",
    } : {
      clinicName: tenant.name,
      clinicAddress: "",
      clinicPhone: "",
      clinicEmail: "",
    };

    // Convert to plain object
    const savedSettings = tenant.publicBookingSettings.toObject
      ? tenant.publicBookingSettings.toObject()
      : { ...tenant.publicBookingSettings };

    return NextResponse.json({
      success: true,
      data: {
        ...savedSettings,
        clinicName: clinicInfoFromTaxConfig.clinicName,
        clinicAddress: clinicInfoFromTaxConfig.clinicAddress,
        clinicPhone: clinicInfoFromTaxConfig.clinicPhone,
        clinicEmail: clinicInfoFromTaxConfig.clinicEmail,
      },
    });
  } catch (error) {
    console.error("Update public booking settings error:", error);
    return NextResponse.json(
      { error: "Failed to update public booking settings" },
      { status: 500 }
    );
  }
}
