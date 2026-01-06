import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { User, Role } from "@/models";
import { validatePassword, isValidObjectId } from "@/lib/security";

// GET all users for the tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "users" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const users = await User.find({ tenantId: session.user.tenant.id })
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("roleId", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "users" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email, password, roleId, isActive } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Validate roleId if provided
    if (roleId && !isValidObjectId(roleId)) {
      return NextResponse.json(
        { error: "Invalid role ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already exists in this tenant
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      tenantId: session.user.tenant.id,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Validate role belongs to tenant
    let userRoleId = roleId;
    if (roleId) {
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
    } else {
      // Use default role
      const defaultRole = await Role.findOne({
        tenantId: session.user.tenant.id,
        isDefault: true,
      });

      if (!defaultRole) {
        return NextResponse.json(
          { error: "No default role found" },
          { status: 400 }
        );
      }

      userRoleId = defaultRole._id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      tenantId: session.user.tenant.id,
      roleId: userRoleId,
      isActive: isActive !== false,
    });

    // Return user without password
    const userResponse = await User.findById(user._id)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("roleId", "name");

    return NextResponse.json(
      { success: true, data: userResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
