import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { TaxConfig } from "@/models";
import { getCountryConfig } from "@/lib/tax/countries";

// Helper to mask sensitive fields
function maskSensitiveValue(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "••••••••";
  return "••••••••" + value.slice(-4);
}

// Helper to check if value is masked
function isMaskedValue(value: string | undefined): boolean {
  return !!value?.startsWith("••••");
}

// GET payment settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const config = await TaxConfig.findOne({
      tenantId: session.user.tenant.id,
    }).select("countryCode upiSettings razorpaySettings gatewaySettings").lean();

    // Get country config for available gateways
    const countryCode = config?.countryCode || "IN";
    const countryConfig = getCountryConfig(countryCode);
    const paymentConfig = countryConfig?.paymentConfig;

    if (!config) {
      // Return defaults if no config exists
      return NextResponse.json({
        success: true,
        data: {
          countryCode,
          paymentConfig,
          upiSettings: {
            enabled: false,
            vpa: "",
            merchantName: "",
            merchantCode: "",
            showQROnInvoice: true,
          },
          razorpaySettings: {
            enabled: false,
            keyId: "",
            keySecret: "",
            webhookSecret: "",
            accountId: "",
            sandbox: true,
            autoCapture: true,
            paymentMethods: {
              card: true,
              upi: true,
              netbanking: true,
              wallet: true,
              emi: false,
            },
          },
          gatewaySettings: {},
        },
      });
    }

    // Mask sensitive data for UPI and Razorpay
    const maskedConfig = {
      countryCode,
      paymentConfig,
      upiSettings: config.upiSettings || {
        enabled: false,
        vpa: "",
        merchantName: "",
        merchantCode: "",
        showQROnInvoice: true,
      },
      razorpaySettings: config.razorpaySettings
        ? {
            ...config.razorpaySettings,
            keySecret: maskSensitiveValue(config.razorpaySettings.keySecret),
            webhookSecret: config.razorpaySettings.webhookSecret
              ? "••••••••"
              : "",
          }
        : {
            enabled: false,
            keyId: "",
            keySecret: "",
            webhookSecret: "",
            accountId: "",
            sandbox: true,
            autoCapture: true,
            paymentMethods: {
              card: true,
              upi: true,
              netbanking: true,
              wallet: true,
              emi: false,
            },
          },
      gatewaySettings: maskGatewaySettings(config.gatewaySettings || {}, paymentConfig),
    };

    return NextResponse.json({ success: true, data: maskedConfig });
  } catch (error) {
    console.error("Get payment settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}

// Helper to mask gateway settings based on country config
function maskGatewaySettings(
  gatewaySettings: Record<string, Record<string, unknown>>,
  paymentConfig: { gateways: Array<{ id: string; settingsFields: Array<{ name: string; type: string }> }> } | undefined
) {
  if (!paymentConfig) return gatewaySettings;

  const masked: Record<string, Record<string, unknown>> = {};

  for (const gateway of paymentConfig.gateways) {
    const settings = gatewaySettings[gateway.id] || { enabled: false };
    const maskedGateway: Record<string, unknown> = { ...settings };

    // Mask password fields
    for (const field of gateway.settingsFields) {
      if (field.type === "password" && settings[field.name]) {
        maskedGateway[field.name] = maskSensitiveValue(settings[field.name] as string);
      }
    }

    masked[gateway.id] = maskedGateway;
  }

  return masked;
}

// PUT update payment settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for admin permission
    const isAdmin = session.user.role.name === "Admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const { upiSettings, razorpaySettings, gatewaySettings } = data;

    await dbConnect();

    // Get existing config to preserve secrets if masked values are sent
    const existingConfig = await TaxConfig.findOne({
      tenantId: session.user.tenant.id,
    }).select("countryCode razorpaySettings gatewaySettings").lean();

    if (!existingConfig) {
      return NextResponse.json(
        { error: "Tax configuration not found. Please set up tax configuration first." },
        { status: 404 }
      );
    }

    const countryConfig = getCountryConfig(existingConfig.countryCode);
    const paymentConfig = countryConfig?.paymentConfig;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (upiSettings) {
      updateData.upiSettings = {
        enabled: upiSettings.enabled || false,
        vpa: upiSettings.vpa || "",
        merchantName: upiSettings.merchantName || "",
        merchantCode: upiSettings.merchantCode || "",
        showQROnInvoice: upiSettings.showQROnInvoice !== false,
      };
    }

    if (razorpaySettings) {
      const existingRazorpay = existingConfig?.razorpaySettings;

      updateData.razorpaySettings = {
        enabled: razorpaySettings.enabled || false,
        keyId: razorpaySettings.keyId || "",
        // Only update secret if it's not the masked value
        keySecret: isMaskedValue(razorpaySettings.keySecret)
          ? existingRazorpay?.keySecret || ""
          : razorpaySettings.keySecret || "",
        webhookSecret: isMaskedValue(razorpaySettings.webhookSecret)
          ? existingRazorpay?.webhookSecret || ""
          : razorpaySettings.webhookSecret || "",
        accountId: razorpaySettings.accountId || "",
        sandbox: razorpaySettings.sandbox !== false,
        autoCapture: razorpaySettings.autoCapture !== false,
        paymentMethods: {
          card: razorpaySettings.paymentMethods?.card !== false,
          upi: razorpaySettings.paymentMethods?.upi !== false,
          netbanking: razorpaySettings.paymentMethods?.netbanking !== false,
          wallet: razorpaySettings.paymentMethods?.wallet !== false,
          emi: razorpaySettings.paymentMethods?.emi || false,
        },
      };
    }

    // Handle dynamic gateway settings
    if (gatewaySettings && paymentConfig) {
      const existingGateways = existingConfig?.gatewaySettings || {};
      const updatedGateways: Record<string, Record<string, unknown>> = {};

      for (const gateway of paymentConfig.gateways) {
        const newSettings = gatewaySettings[gateway.id];
        if (!newSettings) continue;

        const existingGateway = existingGateways[gateway.id] || {};
        const processedSettings: Record<string, unknown> = {};

        for (const field of gateway.settingsFields) {
          const newValue = newSettings[field.name];

          if (field.type === "password" && isMaskedValue(newValue as string)) {
            // Preserve existing secret
            processedSettings[field.name] = existingGateway[field.name] || "";
          } else {
            processedSettings[field.name] = newValue ?? (field.type === "switch" ? false : "");
          }
        }

        // Always include enabled status
        processedSettings.enabled = newSettings.enabled || false;
        updatedGateways[gateway.id] = processedSettings;
      }

      updateData.gatewaySettings = updatedGateways;
    }

    const config = await TaxConfig.findOneAndUpdate(
      { tenantId: session.user.tenant.id },
      { $set: updateData },
      { new: true, upsert: false }
    );

    if (!config) {
      return NextResponse.json(
        { error: "Tax configuration not found. Please set up tax configuration first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment settings updated successfully",
    });
  } catch (error) {
    console.error("Update payment settings error:", error);
    return NextResponse.json(
      { error: "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
