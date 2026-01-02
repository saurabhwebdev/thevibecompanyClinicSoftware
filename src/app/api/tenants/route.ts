import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db/mongoose";
import { Tenant, Role, User } from "@/models";

// POST create a new tenant (public - for registration)
export async function POST(request: NextRequest) {
  try {
    const { name, slug, adminName, adminEmail, adminPassword } = await request.json();

    if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if tenant slug already exists
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      return NextResponse.json(
        { error: "Organization slug already exists" },
        { status: 400 }
      );
    }

    // Create tenant
    const tenant = await Tenant.create({
      name,
      slug,
      isActive: true,
    });

    // Create default roles for the tenant
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

    await Role.create({
      name: "Doctor",
      description: "Doctor with patient access",
      tenantId: tenant._id,
      isDefault: false,
      isSystem: false,
      permissions: [
        { resource: "dashboard", actions: ["read"] },
        { resource: "patients", actions: ["read", "update"] },
        { resource: "appointments", actions: ["create", "read", "update"] },
        { resource: "reports", actions: ["read"] },
      ],
    });

    await Role.create({
      name: "Staff",
      description: "Staff with limited access",
      tenantId: tenant._id,
      isDefault: false,
      isSystem: false,
      permissions: [
        { resource: "dashboard", actions: ["read"] },
        { resource: "patients", actions: ["read"] },
        { resource: "appointments", actions: ["create", "read", "update"] },
      ],
    });

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
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      tenantId: tenant._id,
      roleId: adminRole._id,
      isActive: true,
      emailVerified: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Organization created successfully",
        data: {
          tenant: {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tenant error:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

// GET check if tenant slug exists (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const tenant = await Tenant.findOne({ slug, isActive: true });

    return NextResponse.json({
      success: true,
      exists: !!tenant,
      data: tenant ? { name: tenant.name, slug: tenant.slug } : null,
    });
  } catch (error) {
    console.error("Check tenant error:", error);
    return NextResponse.json(
      { error: "Failed to check organization" },
      { status: 500 }
    );
  }
}
