import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Role } from "@/models";

// GET all roles for the tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const roles = await Role.find({ tenantId: session.user.tenant.id })
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("Get roles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

// POST create a new role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create roles
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "roles" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, description, permissions, isDefault } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if role name already exists for this tenant
    const existingRole = await Role.findOne({
      name,
      tenantId: session.user.tenant.id,
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "Role name already exists" },
        { status: 400 }
      );
    }

    // If this role is set as default, unset other default roles
    if (isDefault) {
      await Role.updateMany(
        { tenantId: session.user.tenant.id, isDefault: true },
        { isDefault: false }
      );
    }

    const role = await Role.create({
      name,
      description,
      permissions: permissions || [],
      tenantId: session.user.tenant.id,
      isDefault: isDefault || false,
      isSystem: false,
    });

    return NextResponse.json(
      { success: true, data: role },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create role error:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
