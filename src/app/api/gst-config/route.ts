import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { GSTConfig } from "@/models";

// GET GST config for the tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const gstConfig = await GSTConfig.findOne({
      tenantId: session.user.tenant.id
    });

    return NextResponse.json({
      success: true,
      data: gstConfig,
      exists: !!gstConfig
    });
  } catch (error) {
    console.error("Get GST config error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GST configuration" },
      { status: 500 }
    );
  }
}

// POST/PUT create or update GST config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage settings
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "settings" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();

    await dbConnect();

    // Check if config already exists
    const existingConfig = await GSTConfig.findOne({
      tenantId: session.user.tenant.id
    });

    let gstConfig;

    if (existingConfig) {
      // Update existing config
      gstConfig = await GSTConfig.findOneAndUpdate(
        { tenantId: session.user.tenant.id },
        {
          ...data,
          tenantId: session.user.tenant.id,
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new config
      gstConfig = await GSTConfig.create({
        ...data,
        tenantId: session.user.tenant.id,
      });
    }

    return NextResponse.json(
      { success: true, data: gstConfig },
      { status: existingConfig ? 200 : 201 }
    );
  } catch (error: unknown) {
    console.error("Save GST config error:", error);

    // Handle validation errors
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
      { error: "Failed to save GST configuration" },
      { status: 500 }
    );
  }
}

// DELETE GST config
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "settings" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    await GSTConfig.findOneAndDelete({ tenantId: session.user.tenant.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete GST config error:", error);
    return NextResponse.json(
      { error: "Failed to delete GST configuration" },
      { status: 500 }
    );
  }
}
