import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Invoice, Product, TaxConfig, Payment } from "@/models";

// Helper function to format IDs
function formatId(prefix: string, number: number, padding: number = 4): string {
  return `${prefix}-${String(number).padStart(padding, "0")}`;
}

// GET all invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "invoices" && p.actions.includes("read")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const patientId = searchParams.get("patientId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = { tenantId: session.user.tenant.id };

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        (query.invoiceDate as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.invoiceDate as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("patientId", "firstName lastName patientId phone")
        .populate("doctorId", "name email")
        .populate("createdBy", "name email")
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST create invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "invoices" && p.actions.includes("create")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();

    await dbConnect();

    // Get tax config for invoice prefix
    const taxConfig = await TaxConfig.findOne({ tenantId: session.user.tenant.id });
    const prefix = taxConfig?.invoiceSettings?.prefix || "INV";
    const currentNumber = taxConfig?.invoiceSettings?.currentNumber || 1;

    // Generate invoice number
    const invoiceNumber = formatId(prefix, currentNumber);

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const taxBreakdown: Record<number, { taxName: string; taxRate: number; taxableAmount: number; taxAmount: number }> = {};

    const items = data.items.map((item: {
      productId?: string;
      type: string;
      name: string;
      description?: string;
      hsnCode?: string;
      sacCode?: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discount: number;
      discountType: "percentage" | "fixed";
      taxRate: number;
      batchNumber?: string;
    }) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      let discountAmount = 0;

      if (item.discount > 0) {
        if (item.discountType === "percentage") {
          discountAmount = (itemSubtotal * item.discount) / 100;
        } else {
          discountAmount = item.discount;
        }
      }

      const taxableAmount = itemSubtotal - discountAmount;
      const taxAmount = (taxableAmount * item.taxRate) / 100;
      const itemTotal = taxableAmount + taxAmount;

      subtotal += itemSubtotal;
      totalTax += taxAmount;

      // Track tax breakdown
      if (!taxBreakdown[item.taxRate]) {
        taxBreakdown[item.taxRate] = {
          taxName: `GST ${item.taxRate}%`,
          taxRate: item.taxRate,
          taxableAmount: 0,
          taxAmount: 0,
        };
      }
      taxBreakdown[item.taxRate].taxableAmount += taxableAmount;
      taxBreakdown[item.taxRate].taxAmount += taxAmount;

      return {
        ...item,
        subtotal: itemSubtotal,
        taxAmount,
        total: itemTotal,
      };
    });

    // Calculate overall discount
    let overallDiscount = 0;
    if (data.discountAmount > 0) {
      if (data.discountType === "percentage") {
        overallDiscount = (subtotal * data.discountAmount) / 100;
      } else {
        overallDiscount = data.discountAmount;
      }
    }

    const taxableAmount = subtotal - overallDiscount;
    const totalAmount = taxableAmount + totalTax;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const grandTotal = Math.round(totalAmount);

    // Create invoice
    const invoice = await Invoice.create({
      tenantId: session.user.tenant.id,
      invoiceNumber,
      invoiceDate: data.invoiceDate || new Date(),
      dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      patientId: data.patientId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      appointmentId: data.appointmentId,
      prescriptionId: data.prescriptionId,
      doctorId: data.doctorId,
      items,
      subtotal,
      discountAmount: overallDiscount,
      discountType: data.discountType || "fixed",
      taxableAmount,
      totalTax,
      totalAmount,
      roundOff,
      grandTotal,
      taxBreakdown: Object.values(taxBreakdown),
      paymentStatus: "unpaid",
      paidAmount: 0,
      balanceAmount: grandTotal,
      paymentMethod: data.paymentMethod,
      status: data.status || "draft",
      notes: data.notes,
      termsAndConditions: taxConfig?.invoiceSettings?.termsAndConditions,
      internalNotes: data.internalNotes,
      createdBy: session.user.id,
    });

    // Update tax config current number
    if (taxConfig) {
      await TaxConfig.updateOne(
        { _id: taxConfig._id },
        { $inc: { "invoiceSettings.currentNumber": 1 } }
      );
    }

    // Update product stock if items have productIds
    for (const item of items) {
      if (item.productId) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { currentStock: -item.quantity } }
        );
      }
    }

    // If payment is made immediately
    if (data.paymentAmount && data.paymentAmount > 0) {
      const paymentNumber = formatId("PAY", currentNumber);

      await Payment.create({
        tenantId: session.user.tenant.id,
        paymentNumber,
        invoiceId: invoice._id,
        patientId: data.patientId,
        amount: data.paymentAmount,
        paymentDate: new Date(),
        paymentMethod: data.paymentMethod || "cash",
        transactionId: data.transactionId,
        status: "completed",
        createdBy: session.user.id,
      });

      // Update invoice payment status
      invoice.paidAmount = data.paymentAmount;
      invoice.balanceAmount = grandTotal - data.paymentAmount;
      invoice.paymentStatus = data.paymentAmount >= grandTotal ? "paid" : "partial";
      invoice.status = data.paymentAmount >= grandTotal ? "paid" : invoice.status;
      await invoice.save();
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("patientId", "firstName lastName patientId phone email")
      .populate("doctorId", "name email")
      .populate("createdBy", "name email");

    return NextResponse.json(
      { success: true, data: populatedInvoice },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
