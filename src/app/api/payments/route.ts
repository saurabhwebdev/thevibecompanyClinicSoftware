import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Payment, Invoice, TaxConfig } from "@/models";

// Helper function to format IDs
function formatId(prefix: string, number: number, padding: number = 4): string {
  return `${prefix}-${String(number).padStart(padding, "0")}`;
}

// GET all payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "payments" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const invoiceId = searchParams.get("invoiceId") || "";
    const patientId = searchParams.get("patientId") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: "i" } },
        { transactionId: { $regex: search, $options: "i" } },
      ];
    }

    if (invoiceId) {
      query.invoiceId = invoiceId;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) {
        (query.paymentDate as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.paymentDate as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("invoiceId", "invoiceNumber grandTotal customerName")
        .populate("patientId", "firstName lastName patientId")
        .populate("createdBy", "name email")
        .lean(),
      Payment.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST create payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "payments" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    if (!data.amount || data.amount <= 0) {
      return NextResponse.json(
        { error: "Valid payment amount is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get invoice
    const invoice = await Invoice.findOne({
      _id: data.invoiceId,
      tenantId: session.user.tenant.id,
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Check if payment exceeds balance
    if (data.amount > invoice.balanceAmount) {
      return NextResponse.json(
        { error: `Payment amount cannot exceed balance of ${invoice.balanceAmount}` },
        { status: 400 }
      );
    }

    // Get tax config for payment number
    const taxConfig = await TaxConfig.findOne({ tenantId: session.user.tenant.id });
    const lastPayment = await Payment.findOne({ tenantId: session.user.tenant.id })
      .sort({ createdAt: -1 });

    let paymentCounter = 1;
    if (lastPayment?.paymentNumber) {
      const match = lastPayment.paymentNumber.match(/\d+$/);
      if (match) {
        paymentCounter = parseInt(match[0]) + 1;
      }
    }

    const paymentNumber = formatId("PAY", paymentCounter);

    // Create payment
    const payment = await Payment.create({
      tenantId: session.user.tenant.id,
      paymentNumber,
      invoiceId: data.invoiceId,
      patientId: invoice.patientId,
      amount: data.amount,
      paymentDate: data.paymentDate || new Date(),
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      chequeNumber: data.chequeNumber,
      chequeDate: data.chequeDate,
      bankName: data.bankName,
      cardLast4: data.cardLast4,
      cardType: data.cardType,
      upiId: data.upiId,
      insuranceClaimNumber: data.insuranceClaimNumber,
      insuranceProvider: data.insuranceProvider,
      status: data.status || "completed",
      notes: data.notes,
      receiptNumber: formatId("RCP", paymentCounter),
      receiptGenerated: true,
      createdBy: session.user.id,
    });

    // Update invoice payment status
    invoice.paidAmount += data.amount;
    invoice.balanceAmount = invoice.grandTotal - invoice.paidAmount;
    invoice.paymentMethod = data.paymentMethod;

    if (invoice.paidAmount >= invoice.grandTotal) {
      invoice.paymentStatus = "paid";
      invoice.status = "paid";
    } else {
      invoice.paymentStatus = "partial";
    }

    await invoice.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate("invoiceId", "invoiceNumber grandTotal customerName")
      .populate("patientId", "firstName lastName patientId")
      .populate("createdBy", "name email");

    return NextResponse.json(
      { success: true, data: populatedPayment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
