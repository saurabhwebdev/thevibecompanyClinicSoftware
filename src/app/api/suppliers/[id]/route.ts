import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Supplier from "@/models/Supplier";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET a single supplier
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await dbConnect();

    const supplier = await Supplier.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .populate("categories", "name")
      .populate("createdBy", "name");

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error("Get supplier error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

// PUT update a supplier
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

    const supplier = await Supplier.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const updateableFields = [
      "name",
      "companyName",
      "email",
      "phone",
      "alternatePhone",
      "website",
      "address",
      "gstin",
      "pan",
      "taxRegistrationNumber",
      "bankDetails",
      "businessType",
      "paymentTerms",
      "creditLimit",
      "creditPeriodDays",
      "contacts",
      "categories",
      "status",
      "rating",
      "notes",
    ];

    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        (supplier as unknown as Record<string, unknown>)[field] = body[field];
      }
    });

    await supplier.save();

    const supplierResponse = await Supplier.findById(id)
      .populate("categories", "name")
      .populate("createdBy", "name");

    return NextResponse.json({ success: true, data: supplierResponse });
  } catch (error) {
    console.error("Update supplier error:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

// DELETE a supplier
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

    const supplier = await Supplier.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await Supplier.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
