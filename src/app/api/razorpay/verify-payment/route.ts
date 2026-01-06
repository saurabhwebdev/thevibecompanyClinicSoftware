import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { TaxConfig } from "@/models";
import crypto from "crypto";

// POST verify Razorpay payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    await dbConnect();

    // Get Razorpay settings
    const config = await TaxConfig.findOne({
      tenantId: session.user.tenant.id,
    }).select("razorpaySettings").lean();

    if (!config?.razorpaySettings?.keySecret) {
      return NextResponse.json(
        { error: "Razorpay is not configured" },
        { status: 400 }
      );
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpaySettings.keySecret)
      .update(body.toString())
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
