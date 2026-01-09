import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { getQueueStatus, getQueueStatusByDoctor } from "@/lib/token-generator";

// GET queue status for today
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();

    let queueStatus;
    if (doctorId) {
      queueStatus = await getQueueStatusByDoctor(session.user.tenant.id, doctorId, date);
    } else {
      queueStatus = await getQueueStatus(session.user.tenant.id, date);
    }

    return NextResponse.json({ success: true, data: queueStatus });
  } catch (error) {
    console.error("Get queue status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue status" },
      { status: 500 }
    );
  }
}
