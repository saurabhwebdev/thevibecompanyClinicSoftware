import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Supplier from "@/models/Supplier";

// Generate unique supplier ID
async function generateSupplierId(tenantId: string): Promise<string> {
  const count = await Supplier.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(5, "0");
  return `SUP${paddedNumber}`;
}

// GET all suppliers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { supplierId: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .populate("categories", "name")
        .populate("createdBy", "name"),
      Supplier.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

// POST create a new supplier
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
    const {
      name,
      companyName,
      email,
      phone,
      alternatePhone,
      website,
      address,
      gstin,
      pan,
      taxRegistrationNumber,
      bankDetails,
      businessType,
      paymentTerms,
      creditLimit,
      creditPeriodDays,
      contacts,
      categories,
      notes,
    } = body;

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: "Name, phone, and address are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const supplierId = await generateSupplierId(session.user.tenant.id);

    const supplier = await Supplier.create({
      tenantId: session.user.tenant.id,
      supplierId,
      name,
      companyName,
      email,
      phone,
      alternatePhone,
      website,
      address,
      gstin,
      pan,
      taxRegistrationNumber,
      bankDetails,
      businessType,
      paymentTerms,
      creditLimit: creditLimit || 0,
      creditPeriodDays: creditPeriodDays || 30,
      contacts: contacts || [],
      categories: categories || [],
      notes,
      createdBy: session.user.id,
    });

    const supplierResponse = await Supplier.findById(supplier._id)
      .populate("categories", "name")
      .populate("createdBy", "name");

    return NextResponse.json(
      { success: true, data: supplierResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
