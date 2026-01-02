import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db/mongoose";
import { Tenant, Role, User } from "@/models";

// Seed a default tenant for development
export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Seeding not allowed in production" },
        { status: 403 }
      );
    }

    await dbConnect();

    // Check if default tenant already exists
    const existingTenant = await Tenant.findOne({ slug: "default" });
    if (existingTenant) {
      return NextResponse.json({
        success: true,
        message: "Default tenant already exists",
      });
    }

    // Create default tenant
    const tenant = await Tenant.create({
      name: "Default Clinic",
      slug: "default",
      isActive: true,
    });

    // Create admin role
    const adminRole = await Role.create({
      name: "Admin",
      description: "Full access to all resources",
      tenantId: tenant._id,
      isDefault: false,
      isSystem: true,
      permissions: [
        { resource: "dashboard", actions: ["create", "read", "update", "delete"] },
        { resource: "users", actions: ["create", "read", "update", "delete"] },
        { resource: "roles", actions: ["create", "read", "update", "delete"] },
        { resource: "settings", actions: ["create", "read", "update", "delete"] },
        { resource: "patients", actions: ["create", "read", "update", "delete"] },
        { resource: "appointments", actions: ["create", "read", "update", "delete"] },
        { resource: "reports", actions: ["create", "read", "update", "delete"] },
      ],
    });

    // Create default user role
    await Role.create({
      name: "User",
      description: "Default user role",
      tenantId: tenant._id,
      isDefault: true,
      isSystem: false,
      permissions: [
        { resource: "dashboard", actions: ["read"] },
        { resource: "profile", actions: ["read", "update"] },
      ],
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await User.create({
      name: "Admin User",
      email: "admin@clinic.com",
      password: hashedPassword,
      tenantId: tenant._id,
      roleId: adminRole._id,
      isActive: true,
      emailVerified: true,
    });

    return NextResponse.json({
      success: true,
      message: "Default tenant seeded successfully",
      credentials: {
        email: "admin@clinic.com",
        password: "admin123",
        tenant: "default",
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
