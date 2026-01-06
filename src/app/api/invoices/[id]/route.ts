import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Types } from "mongoose";
import { Invoice, Payment } from "@/models";

// GET single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const invoice = await Invoice.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    })
      .populate("patientId", "firstName lastName patientId phone email address dateOfBirth gender")
      .populate("doctorId", "name email")
      .populate("appointmentId", "appointmentId appointmentDate type")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Get payments for this invoice
    const payments = await Payment.find({
      invoiceId: id,
      tenantId: session.user.tenant.id,
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    return NextResponse.json({
      success: true,
      data: { ...invoice.toObject(), payments },
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PUT update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "invoices" && p.actions.includes("update")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();

    await dbConnect();

    const invoice = await Invoice.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Only allow updates to draft invoices
    if (invoice.status !== "draft" && !data.forceUpdate) {
      return NextResponse.json(
        { error: "Can only update draft invoices" },
        { status: 400 }
      );
    }

    // Update allowed fields
    const allowedFields = [
      "customerName",
      "customerEmail",
      "customerPhone",
      "customerAddress",
      "dueDate",
      "notes",
      "internalNotes",
      "status",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (invoice as unknown as Record<string, unknown>)[field] = data[field];
      }
    }

    invoice.updatedBy = new Types.ObjectId(session.user.id);
    await invoice.save();

    const updatedInvoice = await Invoice.findById(id)
      .populate("patientId", "firstName lastName patientId phone email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return NextResponse.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// DELETE cancel invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = session.user.role.permissions.some(
      (p) => p.resource === "invoices" && p.actions.includes("delete")
    );

    if (!hasPermission && session.user.role.name !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { reason } = await request.json().catch(() => ({ reason: "" }));

    await dbConnect();

    const invoice = await Invoice.findOne({
      _id: id,
      tenantId: session.user.tenant.id,
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Soft delete - mark as cancelled
    invoice.status = "cancelled";
    invoice.paymentStatus = "cancelled";
    invoice.cancelledBy = new Types.ObjectId(session.user.id);
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = reason;
    await invoice.save();

    return NextResponse.json({ success: true, message: "Invoice cancelled" });
  } catch (error) {
    console.error("Cancel invoice error:", error);
    return NextResponse.json(
      { error: "Failed to cancel invoice" },
      { status: 500 }
    );
  }
}
