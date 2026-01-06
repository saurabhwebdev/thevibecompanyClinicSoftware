import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import StockMovement from "@/models/StockMovement";

// GET all stock movements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const direction = searchParams.get("direction");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (productId) {
      query.productId = productId;
    }

    if (type && type !== "all") {
      query.type = type;
    }

    if (direction && direction !== "all") {
      query.direction = direction;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("productId", "name sku unit")
        .populate("supplierId", "name")
        .populate("patientId", "firstName lastName patientId")
        .populate("createdBy", "name"),
      StockMovement.countDocuments(query),
    ]);

    // Calculate totals
    const totals = await StockMovement.aggregate([
      { $match: { tenantId: session.user.tenant.id } },
      {
        $group: {
          _id: "$direction",
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: "$totalValue" },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      totals: {
        in: totals.find((t) => t._id === "in") || { totalQuantity: 0, totalValue: 0 },
        out: totals.find((t) => t._id === "out") || { totalQuantity: 0, totalValue: 0 },
      },
    });
  } catch (error) {
    console.error("Get stock movements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
