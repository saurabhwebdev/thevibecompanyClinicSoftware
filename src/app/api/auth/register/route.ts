import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db/mongoose";
import { User, Tenant, Role } from "@/models";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, tenantSlug, tenantName, createNewTenant } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Organization identifier is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase letters, numbers, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(tenantSlug)) {
      return NextResponse.json(
        { error: "Organization identifier can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Slug length validation
    if (tenantSlug.length < 3 || tenantSlug.length > 50) {
      return NextResponse.json(
        { error: "Organization identifier must be between 3 and 50 characters" },
        { status: 400 }
      );
    }

    await dbConnect();

    let tenant = await Tenant.findOne({ slug: tenantSlug });

    // If tenant exists and user is trying to create a new one
    if (tenant && createNewTenant) {
      return NextResponse.json(
        { error: "An organization with this identifier already exists. Please choose a different one or join the existing organization." },
        { status: 400 }
      );
    }

    // If tenant doesn't exist and user is NOT trying to create a new one
    if (!tenant && !createNewTenant) {
      return NextResponse.json(
        { error: "Organization not found. Please check the identifier or create a new organization." },
        { status: 400 }
      );
    }

    // If tenant doesn't exist, create it (new organization flow)
    if (!tenant && createNewTenant) {
      // Validate tenant name for new organizations
      if (!tenantName || tenantName.trim().length < 2) {
        return NextResponse.json(
          { error: "Organization name must be at least 2 characters" },
          { status: 400 }
        );
      }

      try {
        tenant = await Tenant.create({
          name: tenantName.trim(),
          slug: tenantSlug.toLowerCase(),
          isActive: true,
        });

        // Create default roles for the new tenant
        await Role.create({
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
      } catch (createError) {
        console.error("Error creating tenant:", createError);
        return NextResponse.json(
          { error: "Failed to create organization. Please try again." },
          { status: 500 }
        );
      }
    }

    // At this point tenant must exist (either found or created)
    if (!tenant) {
      return NextResponse.json(
        { error: "Failed to process organization. Please try again." },
        { status: 500 }
      );
    }

    // Check if tenant is active
    if (!tenant.isActive) {
      return NextResponse.json(
        { error: "This organization is currently inactive. Please contact support." },
        { status: 400 }
      );
    }

    // Check if user already exists in this tenant
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      tenantId: tenant._id,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists in this organization" },
        { status: 400 }
      );
    }

    // Get appropriate role
    let userRole;

    if (createNewTenant) {
      // First user of a new tenant gets Admin role
      userRole = await Role.findOne({
        tenantId: tenant._id,
        name: "Admin",
      });
    } else {
      // Existing tenant - get default role
      userRole = await Role.findOne({
        tenantId: tenant._id,
        isDefault: true,
      });
    }

    // Fallback: create default role if none exists
    if (!userRole) {
      userRole = await Role.create({
        name: "User",
        description: "Default user role",
        tenantId: tenant._id,
        isDefault: true,
        permissions: [
          { resource: "dashboard", actions: ["read"] },
          { resource: "profile", actions: ["read", "update"] },
        ],
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      tenantId: tenant._id,
      roleId: userRole._id,
      emailVerified: false,
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name, tenant.name).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: createNewTenant
          ? "Organization created and registration successful"
          : "Registration successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Handle MongoDB duplicate key error
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
