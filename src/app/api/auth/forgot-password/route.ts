import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db/mongoose";
import { User, Tenant } from "@/models";
import { sendPasswordResetEmail, isEmailEnabled } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, tenantSlug } = await request.json();

    if (!email || !tenantSlug) {
      return NextResponse.json(
        { error: "Email and organization are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find tenant
    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      // Don't reveal if tenant exists or not
      return NextResponse.json({
        success: true,
        message: "If the email exists, a reset link will be sent",
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
      tenantId: tenant._id,
      isActive: true,
    });

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({
        success: true,
        message: "If the email exists, a reset link will be sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save token to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send password reset email if enabled
    isEmailEnabled(tenant._id.toString(), "passwordResetEmail").then((emailEnabled) => {
      if (emailEnabled) {
        sendPasswordResetEmail(user.email, resetToken, tenantSlug).catch((err) => {
          console.error("Failed to send password reset email:", err);
        });
      }
    });

    // Log token in development for testing
    if (process.env.NODE_ENV === "development") {
      console.log(`Reset token for ${email}: ${resetToken}`);
    }

    return NextResponse.json({
      success: true,
      message: "If the email exists, a reset link will be sent",
      // Only include token in development
      ...(process.env.NODE_ENV === "development" && { devToken: resetToken }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
