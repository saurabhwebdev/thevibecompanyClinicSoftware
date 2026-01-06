import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { TaxConfig } from "@/models";
import Razorpay from "razorpay";

// POST create Razorpay order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, currency = "INR", receipt, notes } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    await dbConnect();

    // Get Razorpay settings
    const config = await TaxConfig.findOne({
      tenantId: session.user.tenant.id,
    }).select("razorpaySettings").lean();

    if (!config?.razorpaySettings?.enabled) {
      return NextResponse.json(
        { error: "Razorpay is not configured or enabled" },
        { status: 400 }
      );
    }

    const { keyId, keySecret } = config.razorpaySettings;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured" },
        { status: 400 }
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Create order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId, // Send key ID for frontend
      },
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
