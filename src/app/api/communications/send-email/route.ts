import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Patient from "@/models/Patient";
import Supplier from "@/models/Supplier";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to send communications
    const hasPermission =
      session.user.role.name === "Admin" ||
      session.user.role.permissions.some(
        (p) => p.resource === "communications" && p.actions.includes("create")
      );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { recipientType, recipients, subject, message } = body;

    // Validate required fields
    if (!recipientType || !recipients || !subject || !message) {
      return NextResponse.json(
        { error: "Recipient type, recipients, subject, and message are required" },
        { status: 400 }
      );
    }

    if (!["patients", "suppliers"].includes(recipientType)) {
      return NextResponse.json(
        { error: "Invalid recipient type. Must be 'patients' or 'suppliers'" },
        { status: 400 }
      );
    }

    await dbConnect();

    let emailList: { email: string; name: string }[] = [];

    // Fetch recipients based on type
    if (recipientType === "patients") {
      let query: Record<string, unknown> = {
        tenantId: session.user.tenant.id,
        email: { $exists: true, $ne: "" }
      };

      if (recipients !== "all") {
        query._id = { $in: recipients };
      }

      const patients = await Patient.find(query).select("email firstName lastName");
      emailList = patients.map((p) => ({
        email: p.email,
        name: `${p.firstName} ${p.lastName}`,
      }));
    } else if (recipientType === "suppliers") {
      let query: Record<string, unknown> = {
        tenantId: session.user.tenant.id,
        email: { $exists: true, $ne: "" }
      };

      if (recipients !== "all") {
        query._id = { $in: recipients };
      }

      const suppliers = await Supplier.find(query).select("email name");
      emailList = suppliers.map((s) => ({
        email: s.email,
        name: s.name,
      }));
    }

    if (emailList.length === 0) {
      return NextResponse.json(
        { error: "No recipients found with email addresses" },
        { status: 400 }
      );
    }

    // Send emails to all recipients
    const emailPromises = emailList.map((recipient) =>
      sendEmail({
        to: recipient.email,
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background-color: #3b82f6;
                  color: white;
                  padding: 20px;
                  text-align: center;
                  border-radius: 8px 8px 0 0;
                }
                .content {
                  background-color: #f9fafb;
                  padding: 30px;
                  border-radius: 0 0 8px 8px;
                }
                .message {
                  background-color: white;
                  padding: 20px;
                  border-radius: 8px;
                  margin-bottom: 20px;
                  white-space: pre-wrap;
                }
                .footer {
                  text-align: center;
                  margin-top: 20px;
                  padding-top: 20px;
                  border-top: 1px solid #e5e7eb;
                  color: #6b7280;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${session.user.tenant.name}</h1>
              </div>
              <div class="content">
                <p>Dear ${recipient.name},</p>
                <div class="message">
                  ${message.replace(/\n/g, '<br>')}
                </div>
                <div class="footer">
                  <p>This email was sent from ${session.user.tenant.name}</p>
                  <p>Please do not reply to this email.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }).catch((err) => {
        console.error(`Failed to send email to ${recipient.email}:`, err);
        return null;
      })
    );

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r !== null).length;

    return NextResponse.json({
      success: true,
      count: successCount,
      message: `Email sent to ${successCount} recipient(s)`,
    });
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
