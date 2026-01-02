import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { User, Role } from "@/models";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET a single user
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Users can view their own profile
    const isSelf = id === session.user.id;
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "users" && p.actions.includes("read")
    );

    if (!isSelf && !hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const user = await User.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("roleId", "name permissions");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT update a user
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Users can update their own profile (limited fields)
    const isSelf = id === session.user.id;
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "users" && p.actions.includes("update")
    );

    if (!isSelf && !hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email, password, roleId, isActive } = await request.json();

    await dbConnect();

    const user = await User.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for duplicate email
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        tenantId: session.user.tenant.id,
        _id: { $ne: id },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Self-update limited to name, email, password
    if (isSelf && !hasPermission && session.user.role.name !== "Admin") {
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email.toLowerCase();
      if (password) user.password = await bcrypt.hash(password, 12);
    } else {
      // Admin/permission update all fields
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email.toLowerCase();
      if (password) user.password = await bcrypt.hash(password, 12);
      if (isActive !== undefined) user.isActive = isActive;

      // Validate and update role
      if (roleId !== undefined) {
        const role = await Role.findOne({
          _id: roleId,
          tenantId: session.user.tenant.id,
        });

        if (!role) {
          return NextResponse.json(
            { error: "Invalid role" },
            { status: 400 }
          );
        }

        user.roleId = roleId;
      }
    }

    await user.save();

    const userResponse = await User.findById(id)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("roleId", "name");

    return NextResponse.json({ success: true, data: userResponse });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE a user
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "users" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    // Can't delete yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
