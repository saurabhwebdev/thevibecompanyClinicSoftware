import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { User } from "@/models";
import mongoose from "mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { avatarStyle, avatarSeed } = await request.json();

    // Users can only update their own avatar
    if (session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // Use native MongoDB to bypass any Mongoose caching issues
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const usersCollection = db.collection("users");
    const objectId = new mongoose.Types.ObjectId(id);

    // Check user exists
    const user = await usersCollection.findOne({ _id: objectId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update using native MongoDB
    await usersCollection.updateOne(
      { _id: objectId },
      { $set: { avatarStyle, avatarSeed } }
    );

    return NextResponse.json({
      success: true,
      data: { avatarStyle, avatarSeed },
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await dbConnect();

    const user = await User.findById(id).select("avatarStyle avatarSeed email");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        avatarStyle: user.avatarStyle || "adventurer",
        avatarSeed: user.avatarSeed || user.email,
      },
    });
  } catch (error) {
    console.error("Get avatar error:", error);
    return NextResponse.json(
      { error: "Failed to get avatar" },
      { status: 500 }
    );
  }
}
