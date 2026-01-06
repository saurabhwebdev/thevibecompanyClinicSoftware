import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { User, Role } from "@/models";

// GET all doctors (users with Doctor role) for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Find roles that contain "doctor" in their name (case-insensitive)
    const doctorRoles = await Role.find({
      tenantId: session.user.tenant.id,
      name: { $regex: /doctor/i },
    });

    if (doctorRoles.length === 0) {
      // Return empty array if no Doctor role exists
      return NextResponse.json({ success: true, data: [] });
    }

    // Get all active users with any Doctor role
    const doctorRoleIds = doctorRoles.map(r => r._id);
    const doctors = await User.find({
      tenantId: session.user.tenant.id,
      roleId: { $in: doctorRoleIds },
      isActive: true,
    })
      .select("_id name email")
      .sort({ name: 1 });

    return NextResponse.json({ success: true, data: doctors });
  } catch (error) {
    console.error("Get doctors error:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}
