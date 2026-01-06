import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Category from "@/models/Category";

// GET all categories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parentId = searchParams.get("parentId");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (type) {
      query.type = type;
    }

    if (parentId === "null") {
      query.parentId = null;
    } else if (parentId) {
      query.parentId = parentId;
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .populate("parentId", "name")
      .populate("createdBy", "name");

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "inventory" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, parentId, type, defaultTaxRate, defaultHsnCode, defaultSacCode, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check for duplicate name
    const existing = await Category.findOne({
      tenantId: session.user.tenant.id,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    const category = await Category.create({
      tenantId: session.user.tenant.id,
      name,
      description,
      parentId: parentId || null,
      type: type || "product",
      defaultTaxRate,
      defaultHsnCode,
      defaultSacCode,
      sortOrder: sortOrder || 0,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
