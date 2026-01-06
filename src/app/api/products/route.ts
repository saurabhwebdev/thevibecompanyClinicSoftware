import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import { sendLowStockAlertEmail } from "@/lib/email";
import { escapeRegex } from "@/lib/security";

// Generate unique SKU
async function generateSKU(tenantId: string, type: string): Promise<string> {
  const prefixes: Record<string, string> = {
    product: "PRD",
    medicine: "MED",
    consumable: "CON",
    equipment: "EQP",
    service: "SVC",
  };
  const prefix = prefixes[type] || "PRD";
  const count = await Product.countDocuments({ tenantId, type });
  const paddedNumber = String(count + 1).padStart(5, "0");
  return `${prefix}${paddedNumber}`;
}

// Generate movement ID
async function generateMovementId(tenantId: string): Promise<string> {
  const count = await StockMovement.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `MOV${paddedNumber}`;
}

// GET all products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "inventory" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const lowStock = searchParams.get("lowStock");
    const expiring = searchParams.get("expiring");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (type && type !== "all") {
      query.type = type;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (lowStock === "true") {
      query.isLowStock = true;
    }

    if (expiring === "true") {
      query.hasExpiringStock = true;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { sku: { $regex: safeSearch, $options: "i" } },
        { genericName: { $regex: safeSearch, $options: "i" } },
        { barcode: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .populate("categoryId", "name type")
        .populate("preferredSupplierId", "name")
        .populate("createdBy", "name"),
      Product.countDocuments(query),
    ]);

    // Get summary stats
    const [lowStockCount, expiringCount, totalValue] = await Promise.all([
      Product.countDocuments({ tenantId: session.user.tenant.id, isLowStock: true }),
      Product.countDocuments({ tenantId: session.user.tenant.id, hasExpiringStock: true }),
      Product.aggregate([
        { $match: { tenantId: session.user.tenant.id, status: "active" } },
        { $group: { _id: null, total: { $sum: { $multiply: ["$currentStock", "$costPrice"] } } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        lowStockCount,
        expiringCount,
        totalValue: totalValue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST create a new product
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
      genericName,
      description,
      categoryId,
      type,
      manufacturer,
      composition,
      dosageForm,
      strength,
      packSize,
      prescriptionRequired,
      costPrice,
      sellingPrice,
      mrp,
      discountPercent,
      taxRate,
      hsnCode,
      sacCode,
      taxInclusive,
      currentStock,
      minStockLevel,
      maxStockLevel,
      reorderLevel,
      reorderQuantity,
      unit,
      batchTracking,
      location,
      shelf,
      rack,
      preferredSupplierId,
      alternateSuppliers,
      barcode,
      tags,
      notes,
    } = body;

    if (!name || !categoryId || costPrice === undefined || sellingPrice === undefined || mrp === undefined) {
      return NextResponse.json(
        { error: "Name, category, cost price, selling price, and MRP are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const sku = await generateSKU(session.user.tenant.id, type || "product");

    const product = await Product.create({
      tenantId: session.user.tenant.id,
      sku,
      name,
      genericName,
      description,
      categoryId,
      type: type || "product",
      manufacturer,
      composition,
      dosageForm,
      strength,
      packSize,
      prescriptionRequired: prescriptionRequired || false,
      costPrice,
      sellingPrice,
      mrp,
      discountPercent: discountPercent || 0,
      taxRate: taxRate || 18,
      hsnCode,
      sacCode,
      taxInclusive: taxInclusive || false,
      currentStock: currentStock || 0,
      minStockLevel: minStockLevel || 10,
      maxStockLevel,
      reorderLevel: reorderLevel || 20,
      reorderQuantity,
      unit: unit || "pcs",
      batchTracking: batchTracking || false,
      location,
      shelf,
      rack,
      preferredSupplierId,
      alternateSuppliers: alternateSuppliers || [],
      barcode,
      tags: tags || [],
      notes,
      createdBy: session.user.id,
    });

    // Create opening stock movement if initial stock provided
    if (currentStock && currentStock > 0) {
      const movementId = await generateMovementId(session.user.tenant.id);
      await StockMovement.create({
        tenantId: session.user.tenant.id,
        movementId,
        productId: product._id,
        type: "opening",
        direction: "in",
        quantity: currentStock,
        previousStock: 0,
        newStock: currentStock,
        unitPrice: costPrice,
        totalValue: currentStock * costPrice,
        reason: "Opening stock",
        createdBy: session.user.id,
      });
    }

    const productResponse = await Product.findById(product._id)
      .populate("categoryId", "name type")
      .populate("preferredSupplierId", "name")
      .populate("createdBy", "name");

    return NextResponse.json(
      { success: true, data: productResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
