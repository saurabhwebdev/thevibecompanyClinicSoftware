import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { TaxConfig } from "@/models";
import { getCountryConfig } from "@/lib/tax/countries";

// Helper to mask sensitive keys
function maskSensitiveData(config: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!config) return null;

  const data = JSON.parse(JSON.stringify(config));

  // Mask Razorpay keys
  if (data.razorpaySettings) {
    if (data.razorpaySettings.keyId) {
      data.razorpaySettings.keyId = data.razorpaySettings.keyId.slice(0, 8) + "********";
    }
    if (data.razorpaySettings.keySecret) {
      data.razorpaySettings.keySecret = "********";
    }
    if (data.razorpaySettings.webhookSecret) {
      data.razorpaySettings.webhookSecret = "********";
    }
  }

  // Mask gateway settings
  if (data.gatewaySettings) {
    for (const gateway of Object.keys(data.gatewaySettings)) {
      const settings = data.gatewaySettings[gateway];
      if (settings) {
        // Mask common key patterns
        for (const key of Object.keys(settings)) {
          if (key.toLowerCase().includes("secret") ||
              key.toLowerCase().includes("key") ||
              key.toLowerCase().includes("password") ||
              key.toLowerCase().includes("token")) {
            if (typeof settings[key] === "string" && settings[key].length > 0) {
              settings[key] = "********";
            }
          }
        }
      }
    }
  }

  // Mask digital compliance credentials
  if (data.digitalCompliance?.apiCredentials) {
    if (data.digitalCompliance.apiCredentials.password) {
      data.digitalCompliance.apiCredentials.password = "********";
    }
    if (data.digitalCompliance.apiCredentials.apiKey) {
      data.digitalCompliance.apiCredentials.apiKey = "********";
    }
  }

  return data;
}

// GET tax config for the tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const taxConfig = await TaxConfig.findOne({
      tenantId: session.user.tenant.id
    }).lean();

    // Mask sensitive data before sending to client
    const safeData = maskSensitiveData(taxConfig as Record<string, unknown> | null);

    return NextResponse.json({
      success: true,
      data: safeData,
      exists: !!taxConfig
    });
  } catch (error) {
    console.error("Get tax config error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax configuration" },
      { status: 500 }
    );
  }
}

// POST create or update tax config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => (p.resource === "settings" || p.resource === "tax-config") && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();

    // Validate country
    const countryConfig = getCountryConfig(data.countryCode);
    if (!countryConfig) {
      return NextResponse.json(
        { error: "Invalid country code" },
        { status: 400 }
      );
    }

    // Validate registration number format
    if (data.registrationNumber && !countryConfig.registrationNumberFormat.test(data.registrationNumber)) {
      return NextResponse.json(
        { error: `Invalid ${countryConfig.registrationNumberName} format. ${countryConfig.registrationNumberHelpText}` },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if config exists
    const existingConfig = await TaxConfig.findOne({
      tenantId: session.user.tenant.id
    });

    let taxConfig;

    if (existingConfig) {
      taxConfig = await TaxConfig.findOneAndUpdate(
        { tenantId: session.user.tenant.id },
        {
          ...data,
          tenantId: session.user.tenant.id,
        },
        { new: true, runValidators: true }
      );
    } else {
      taxConfig = await TaxConfig.create({
        ...data,
        tenantId: session.user.tenant.id,
      });
    }

    return NextResponse.json(
      { success: true, data: taxConfig },
      { status: existingConfig ? 200 : 201 }
    );
  } catch (error: unknown) {
    console.error("Save tax config error:", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError" &&
      "errors" in error
    ) {
      const validationError = error as { errors: Record<string, { message: string }> };
      const messages = Object.values(validationError.errors).map((e) => e.message);
      return NextResponse.json(
        { error: messages.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save tax configuration" },
      { status: 500 }
    );
  }
}

// DELETE tax config
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => (p.resource === "settings" || p.resource === "tax-config") && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    await TaxConfig.findOneAndDelete({ tenantId: session.user.tenant.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tax config error:", error);
    return NextResponse.json(
      { error: "Failed to delete tax configuration" },
      { status: 500 }
    );
  }
}
