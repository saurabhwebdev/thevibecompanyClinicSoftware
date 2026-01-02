import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Role } from "@/models";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET a single role
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    await dbConnect();

    const role = await Role.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error("Get role error:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

// PUT update a role
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "roles" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const { name, description, permissions, isDefault } = await request.json();

    await dbConnect();

    const role = await Role.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Don't allow editing system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: "Cannot edit system roles" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        name,
        tenantId: session.user.tenant.id,
        _id: { $ne: id },
      });

      if (existingRole) {
        return NextResponse.json(
          { error: "Role name already exists" },
          { status: 400 }
        );
      }
    }

    // If this role is set as default, unset other default roles
    if (isDefault && !role.isDefault) {
      await Role.updateMany(
        { tenantId: session.user.tenant.id, isDefault: true },
        { isDefault: false }
      );
    }

    // Update role
    if (name !== undefined) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isDefault !== undefined) role.isDefault = isDefault;

    await role.save();

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

// DELETE a role
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "roles" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    const role = await Role.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Don't allow deleting system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 400 }
      );
    }

    // Don't allow deleting default role
    if (role.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default role" },
        { status: 400 }
      );
    }

    await Role.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Delete role error:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
