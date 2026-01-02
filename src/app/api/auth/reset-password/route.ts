import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db/mongoose";
import { User, Tenant } from "@/models";
import { sendPasswordChangedEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { token, password, tenantSlug } = await request.json();

    if (!token || !password || !tenantSlug) {
      return NextResponse.json(
        { error: "Token, password, and organization are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find tenant
    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      tenantId: tenant._id,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send password changed confirmation email
    sendPasswordChangedEmail(user.email, user.name).catch((err) => {
      console.error("Failed to send password changed email:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
