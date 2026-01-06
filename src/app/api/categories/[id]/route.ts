import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Category from "@/models/Category";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET a single category
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await dbConnect();

    const category = await Category.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .populate("parentId", "name")
      .populate("createdBy", "name");

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Get category error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PUT update a category
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "inventory" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    await dbConnect();

    const category = await Category.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check for duplicate name if name is being changed
    if (body.name && body.name !== category.name) {
      const existing = await Category.findOne({
        tenantId: session.user.tenant.id,
        name: { $regex: new RegExp(`^${body.name}$`, "i") },
        _id: { $ne: id },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updateableFields = [
      "name",
      "description",
      "parentId",
      "type",
      "isActive",
      "sortOrder",
      "defaultTaxRate",
      "defaultHsnCode",
      "defaultSacCode",
    ];

    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        (category as unknown as Record<string, unknown>)[field] = body[field];
      }
    });

    await category.save();

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE a category
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "inventory" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await dbConnect();

    const category = await Category.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if category has children
    const hasChildren = await Category.findOne({
      tenantId: session.user.tenant.id,
      parentId: id,
    });

    if (hasChildren) {
      return NextResponse.json(
        { error: "Cannot delete category with subcategories" },
        { status: 400 }
      );
    }

    await Category.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
