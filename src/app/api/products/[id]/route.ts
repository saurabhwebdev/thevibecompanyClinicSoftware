import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import { sendLowStockAlertEmail } from "@/lib/email";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Generate movement ID
async function generateMovementId(tenantId: string): Promise<string> {
  const count = await StockMovement.countDocuments({ tenantId });
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `MOV${paddedNumber}`;
}

// GET a single product
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await dbConnect();

    const product = await Product.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .populate("categoryId", "name type")
      .populate("preferredSupplierId", "name phone email")
      .populate("alternateSuppliers", "name phone")
      .populate("createdBy", "name");

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get recent stock movements
    const recentMovements = await StockMovement.find({
      tenantId: session.user.tenant.id,
      productId: id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("createdBy", "name");

    return NextResponse.json({
      success: true,
      data: product,
      movements: recentMovements,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT update a product
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

    const product = await Product.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updateableFields = [
      "name",
      "genericName",
      "description",
      "categoryId",
      "type",
      "manufacturer",
      "composition",
      "dosageForm",
      "strength",
      "packSize",
      "prescriptionRequired",
      "costPrice",
      "sellingPrice",
      "mrp",
      "discountPercent",
      "taxRate",
      "hsnCode",
      "sacCode",
      "taxInclusive",
      "minStockLevel",
      "maxStockLevel",
      "reorderLevel",
      "reorderQuantity",
      "unit",
      "batchTracking",
      "location",
      "shelf",
      "rack",
      "preferredSupplierId",
      "alternateSuppliers",
      "status",
      "barcode",
      "tags",
      "notes",
    ];

    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        (product as unknown as Record<string, unknown>)[field] = body[field];
      }
    });

    await product.save();

    const productResponse = await Product.findById(id)
      .populate("categoryId", "name type")
      .populate("preferredSupplierId", "name")
      .populate("createdBy", "name");

    return NextResponse.json({ success: true, data: productResponse });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// PATCH for stock adjustments
export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const {
      action, // "add" | "remove" | "adjust" | "purchase"
      quantity,
      reason,
      batchNumber,
      expiryDate,
      manufacturingDate,
      purchasePrice,
      supplierId,
      invoiceNumber,
    } = body;

    if (!action || quantity === undefined || quantity <= 0) {
      return NextResponse.json(
        { error: "Action and positive quantity are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const product = await Product.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const previousStock = product.currentStock;
    let newStock = previousStock;
    let movementType: string;
    let direction: "in" | "out";
    let unitPrice = product.costPrice;

    switch (action) {
      case "add":
      case "purchase":
        newStock = previousStock + quantity;
        movementType = action === "purchase" ? "purchase" : "adjustment";
        direction = "in";
        unitPrice = purchasePrice || product.costPrice;

        // Add batch if batch tracking is enabled
        if (product.batchTracking && batchNumber) {
          product.batches.push({
            batchNumber,
            quantity,
            manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : undefined,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            purchasePrice: unitPrice,
            purchaseDate: new Date(),
            supplierId,
            invoiceNumber,
          });
        }
        break;

      case "remove":
        if (quantity > previousStock) {
          return NextResponse.json(
            { error: "Insufficient stock" },
            { status: 400 }
          );
        }
        newStock = previousStock - quantity;
        movementType = "adjustment";
        direction = "out";
        break;

      case "adjust":
        newStock = quantity; // Set to exact quantity
        movementType = "adjustment";
        direction = quantity > previousStock ? "in" : "out";
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    product.currentStock = newStock;
    await product.save();

    // Create stock movement record
    const movementId = await generateMovementId(session.user.tenant.id);
    await StockMovement.create({
      tenantId: session.user.tenant.id,
      movementId,
      productId: product._id,
      type: movementType,
      direction,
      quantity: action === "adjust" ? Math.abs(newStock - previousStock) : quantity,
      previousStock,
      newStock,
      unitPrice,
      totalValue: (action === "adjust" ? Math.abs(newStock - previousStock) : quantity) * unitPrice,
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      supplierId,
      referenceNumber: invoiceNumber,
      reason: reason || `Stock ${action}`,
      createdBy: session.user.id,
    });

    // Check for low stock and send alert
    if (product.isLowStock && session.user.email) {
      sendLowStockAlertEmail({
        recipientEmail: session.user.email,
        recipientName: session.user.name || "Admin",
        clinicName: session.user.tenant.name,
        productName: product.name,
        productSku: product.sku,
        currentStock: newStock,
        reorderLevel: product.reorderLevel,
        unit: product.unit,
      }).catch((err) => console.error("Failed to send low stock alert:", err));
    }

    const productResponse = await Product.findById(id)
      .populate("categoryId", "name type")
      .populate("preferredSupplierId", "name")
      .populate("createdBy", "name");

    return NextResponse.json({
      success: true,
      data: productResponse,
      message: `Stock ${action} successful`,
    });
  } catch (error) {
    console.error("Stock adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}

// DELETE a product
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

    const product = await Product.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has stock
    if (product.currentStock > 0) {
      return NextResponse.json(
        { error: "Cannot delete product with existing stock. Adjust stock to 0 first." },
        { status: 400 }
      );
    }

    await Product.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
