import nodemailer from "nodemailer";
import dbConnect from "@/lib/db/mongoose";
import TaxConfig from "@/models/TaxConfig";

// Email configuration from environment variables
const emailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "", // For Gmail, use App Password
  },
};

const emailFrom = process.env.EMAIL_FROM || "noreply@clinic.com";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Clinic Management System";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify email connection
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log("Email server connection verified");
    return true;
  } catch (error) {
    console.error("Email server connection failed:", error);
    return false;
  }
}

// Helper function to check if email type is enabled for a tenant
export async function isEmailEnabled(
  tenantId: string,
  emailType: keyof {
    patientWelcomeEmail: boolean;
    prescriptionEmail: boolean;
    medicalRecordEmail: boolean;
    appointmentConfirmationEmail: boolean;
    appointmentReminderEmail: boolean;
    appointmentCancellationEmail: boolean;
    appointmentRescheduleEmail: boolean;
    userWelcomeEmail: boolean;
    passwordResetEmail: boolean;
    passwordChangedEmail: boolean;
    lowStockAlertEmail: boolean;
    expiryAlertEmail: boolean;
    purchaseOrderEmail: boolean;
    stockReceivedEmail: boolean;
  }
): Promise<boolean> {
  try {
    await dbConnect();
    const taxConfig = await TaxConfig.findOne({ tenantId, isActive: true });

    if (!taxConfig || !taxConfig.emailSettings) {
      // If no config found, default to true (allow emails)
      return true;
    }

    return taxConfig.emailSettings[emailType] !== false;
  } catch (error) {
    console.error(`Error checking email settings for ${emailType}:`, error);
    // On error, default to true to not block emails
    return true;
  }
}

// Generic send email function
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"${appName}" <${emailFrom}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });
    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  tenantSlug: string
): Promise<boolean> {
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}&tenant=${tenantSlug}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #4D9DE0; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    ${appName}
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Reset Your Password
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password:
                  </p>

                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4D9DE0; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0 0; color: #5A6570; font-size: 14px; line-height: 1.6;">
                    This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                  </p>

                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #D1D9D1;">

                  <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.6;">
                    If the button doesn't work, copy and paste this link into your browser:
                    <br>
                    <a href="${resetUrl}" style="color: #4D9DE0; word-break: break-all;">${resetUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Reset Your Password - ${appName}`,
    html,
  });
}

// Send welcome email after registration
export async function sendWelcomeEmail(
  email: string,
  name: string,
  tenantName: string
): Promise<boolean> {
  const loginUrl = `${appUrl}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${appName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #17B890; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Welcome to ${appName}!
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${name}! 👋
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    Thank you for joining <strong>${tenantName}</strong>. Your account has been successfully created and you're ready to get started.
                  </p>

                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4D9DE0; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          Sign In to Your Account
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0 0; color: #5A6570; font-size: 14px; line-height: 1.6;">
                    If you have any questions or need assistance, please don't hesitate to reach out to your administrator.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to ${tenantName} - ${appName}`,
    html,
  });
}

// Send password changed confirmation email
export async function sendPasswordChangedEmail(
  email: string,
  name: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #17B890; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Password Changed Successfully
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${name},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    Your password has been successfully changed. You can now use your new password to sign in to your account.
                  </p>

                  <div style="padding: 20px; background-color: #FEF3C7; border-radius: 6px; border-left: 4px solid #F59E0B;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                      <strong>Security Notice:</strong> If you didn't make this change, please contact your administrator immediately and reset your password.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Password Changed - ${appName}`,
    html,
  });
}

// ==================== PATIENT MODULE EMAILS ====================

// Send patient registration confirmation email
export async function sendPatientWelcomeEmail(
  email: string,
  patientName: string,
  patientId: string,
  clinicName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${clinicName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #17B890; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Welcome to ${clinicName}
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${patientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    Thank you for registering with us. Your patient profile has been created successfully.
                  </p>
                  <div style="padding: 20px; background-color: #F0FDF4; border-radius: 6px; border-left: 4px solid #17B890; margin-bottom: 20px;">
                    <p style="margin: 0; color: #166534; font-size: 14px;">
                      <strong>Your Patient ID:</strong> ${patientId}
                    </p>
                    <p style="margin: 10px 0 0; color: #5A6570; font-size: 13px;">
                      Please keep this ID for your records. You may need it for future appointments.
                    </p>
                  </div>
                  <p style="margin: 0; color: #5A6570; font-size: 14px; line-height: 1.6;">
                    If you have any questions, please don't hesitate to contact us.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to ${clinicName} - Patient Registration Confirmed`,
    html,
  });
}

// Send prescription email to patient
interface PrescriptionEmailData {
  patientEmail: string;
  patientName: string;
  prescriptionId: string;
  doctorName: string;
  clinicName: string;
  prescriptionDate: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosis?: string;
  notes?: string;
}

export async function sendPrescriptionEmail(
  data: PrescriptionEmailData
): Promise<boolean> {
  const medicationsHtml = data.medications
    .map(
      (med) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
            <strong style="color: #232C33;">${med.name}</strong>
            <br><span style="color: #5A6570; font-size: 13px;">${med.dosage} - ${med.frequency}</span>
            <br><span style="color: #6B7280; font-size: 12px;">Duration: ${med.duration}</span>
            ${med.instructions ? `<br><span style="color: #059669; font-size: 12px;">Note: ${med.instructions}</span>` : ""}
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Prescription</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #4D9DE0; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Prescription
                  </h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                    ${data.clinicName}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div>
                      <p style="margin: 0 0 5px; color: #5A6570; font-size: 13px;">Patient</p>
                      <p style="margin: 0; color: #232C33; font-size: 16px; font-weight: 600;">${data.patientName}</p>
                    </div>
                  </div>
                  <table style="width: 100%; margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 8px 0;">
                        <span style="color: #5A6570; font-size: 13px;">Prescription ID:</span>
                        <span style="color: #232C33; font-size: 13px; margin-left: 8px;">${data.prescriptionId}</span>
                      </td>
                      <td style="padding: 8px 0; text-align: right;">
                        <span style="color: #5A6570; font-size: 13px;">Date:</span>
                        <span style="color: #232C33; font-size: 13px; margin-left: 8px;">${data.prescriptionDate}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding: 8px 0;">
                        <span style="color: #5A6570; font-size: 13px;">Prescribed by:</span>
                        <span style="color: #232C33; font-size: 13px; margin-left: 8px;">Dr. ${data.doctorName}</span>
                      </td>
                    </tr>
                  </table>
                  ${data.diagnosis ? `
                    <div style="padding: 15px; background-color: #F3F4F6; border-radius: 6px; margin-bottom: 20px;">
                      <p style="margin: 0 0 5px; color: #5A6570; font-size: 12px; text-transform: uppercase;">Diagnosis</p>
                      <p style="margin: 0; color: #232C33; font-size: 14px;">${data.diagnosis}</p>
                    </div>
                  ` : ""}
                  <h3 style="margin: 0 0 15px; color: #232C33; font-size: 16px; font-weight: 600;">Medications</h3>
                  <table style="width: 100%; background-color: #F9FAFB; border-radius: 6px; overflow: hidden;">
                    ${medicationsHtml}
                  </table>
                  ${data.notes ? `
                    <div style="margin-top: 20px; padding: 15px; background-color: #FEF3C7; border-radius: 6px; border-left: 4px solid #F59E0B;">
                      <p style="margin: 0 0 5px; color: #92400E; font-size: 12px; text-transform: uppercase;">Special Instructions</p>
                      <p style="margin: 0; color: #78350F; font-size: 14px;">${data.notes}</p>
                    </div>
                  ` : ""}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Your Prescription (${data.prescriptionId}) - ${data.clinicName}`,
    html,
  });
}

// Send medical record summary email
interface MedicalRecordEmailData {
  patientEmail: string;
  patientName: string;
  clinicName: string;
  visitDate: string;
  visitType: string;
  doctorName: string;
  diagnosis: string[];
  treatmentPlan?: string;
  followUpDate?: string;
  followUpInstructions?: string;
}

export async function sendMedicalRecordEmail(
  data: MedicalRecordEmailData
): Promise<boolean> {
  const diagnosisHtml = data.diagnosis
    .map((d) => `<li style="margin-bottom: 5px; color: #232C33;">${d}</li>`)
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Visit Summary</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #7C3AED; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Visit Summary
                  </h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                    ${data.clinicName}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.patientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    Here is a summary of your recent visit.
                  </p>
                  <table style="width: 100%; margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span style="color: #5A6570; font-size: 13px;">Visit Date:</span>
                        <span style="color: #232C33; font-size: 14px; margin-left: 8px; font-weight: 500;">${data.visitDate}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span style="color: #5A6570; font-size: 13px;">Visit Type:</span>
                        <span style="color: #232C33; font-size: 14px; margin-left: 8px; text-transform: capitalize;">${data.visitType.replace("-", " ")}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span style="color: #5A6570; font-size: 13px;">Attending Doctor:</span>
                        <span style="color: #232C33; font-size: 14px; margin-left: 8px;">Dr. ${data.doctorName}</span>
                      </td>
                    </tr>
                  </table>
                  <div style="padding: 20px; background-color: #F3F4F6; border-radius: 6px; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px; color: #5A6570; font-size: 12px; text-transform: uppercase; font-weight: 600;">Diagnosis</p>
                    <ul style="margin: 0; padding-left: 20px;">
                      ${diagnosisHtml}
                    </ul>
                  </div>
                  ${data.treatmentPlan ? `
                    <div style="padding: 20px; background-color: #EFF6FF; border-radius: 6px; margin-bottom: 20px;">
                      <p style="margin: 0 0 10px; color: #1E40AF; font-size: 12px; text-transform: uppercase; font-weight: 600;">Treatment Plan</p>
                      <p style="margin: 0; color: #1E3A8A; font-size: 14px; line-height: 1.6;">${data.treatmentPlan}</p>
                    </div>
                  ` : ""}
                  ${data.followUpDate ? `
                    <div style="padding: 20px; background-color: #F0FDF4; border-radius: 6px; border-left: 4px solid #17B890;">
                      <p style="margin: 0 0 5px; color: #166534; font-size: 14px; font-weight: 600;">Follow-up Appointment</p>
                      <p style="margin: 0; color: #15803D; font-size: 14px;">${data.followUpDate}</p>
                      ${data.followUpInstructions ? `<p style="margin: 10px 0 0; color: #166534; font-size: 13px;">${data.followUpInstructions}</p>` : ""}
                    </div>
                  ` : ""}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Your Visit Summary (${data.visitDate}) - ${data.clinicName}`,
    html,
  });
}

// Send appointment reminder email
interface AppointmentReminderData {
  patientEmail: string;
  patientName: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  notes?: string;
}

export async function sendAppointmentReminderEmail(
  data: AppointmentReminderData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #F59E0B; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Appointment Reminder
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.patientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    This is a friendly reminder about your upcoming appointment.
                  </p>
                  <div style="padding: 25px; background-color: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #92400E; font-size: 13px;">Date:</span>
                          <span style="color: #78350F; font-size: 16px; margin-left: 8px; font-weight: 600;">${data.appointmentDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #92400E; font-size: 13px;">Time:</span>
                          <span style="color: #78350F; font-size: 16px; margin-left: 8px; font-weight: 600;">${data.appointmentTime}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #92400E; font-size: 13px;">Doctor:</span>
                          <span style="color: #78350F; font-size: 16px; margin-left: 8px;">Dr. ${data.doctorName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #92400E; font-size: 13px;">Location:</span>
                          <span style="color: #78350F; font-size: 16px; margin-left: 8px;">${data.clinicName}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  ${data.notes ? `
                    <p style="margin: 0; color: #5A6570; font-size: 14px; line-height: 1.6;">
                      <strong>Note:</strong> ${data.notes}
                    </p>
                  ` : ""}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Appointment Reminder: ${data.appointmentDate} at ${data.appointmentTime} - ${data.clinicName}`,
    html,
  });
}

// Send appointment confirmation email
interface AppointmentConfirmationData {
  patientEmail: string;
  patientName: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  appointmentType: string;
  reason: string;
}

export async function sendAppointmentConfirmationEmail(
  data: AppointmentConfirmationData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmed</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #17B890; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Appointment Confirmed
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.patientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    Your appointment has been successfully scheduled at ${data.clinicName}.
                  </p>
                  <div style="padding: 25px; background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Date:</span>
                          <span style="color: #15803D; font-size: 16px; margin-left: 8px; font-weight: 600;">${data.appointmentDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Time:</span>
                          <span style="color: #15803D; font-size: 16px; margin-left: 8px; font-weight: 600;">${data.appointmentTime}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Doctor:</span>
                          <span style="color: #15803D; font-size: 16px; margin-left: 8px;">Dr. ${data.doctorName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Type:</span>
                          <span style="color: #15803D; font-size: 16px; margin-left: 8px; text-transform: capitalize;">${data.appointmentType.replace("-", " ")}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Reason:</span>
                          <span style="color: #15803D; font-size: 14px; margin-left: 8px;">${data.reason}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <p style="margin: 0; color: #5A6570; font-size: 14px; line-height: 1.6;">
                    Please arrive 10-15 minutes before your scheduled time. If you need to reschedule or cancel, please contact us as soon as possible.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Appointment Confirmed: ${data.appointmentDate} at ${data.appointmentTime} - ${data.clinicName}`,
    html,
  });
}

// Send appointment cancellation email
interface AppointmentCancellationData {
  patientEmail: string;
  patientName: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  reason: string;
}

export async function sendAppointmentCancellationEmail(
  data: AppointmentCancellationData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Cancelled</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #EF4444; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Appointment Cancelled
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.patientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    We regret to inform you that your appointment has been cancelled.
                  </p>
                  <div style="padding: 25px; background-color: #FEF2F2; border-radius: 8px; border: 1px solid #FECACA; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #991B1B; font-size: 13px;">Date:</span>
                          <span style="color: #DC2626; font-size: 16px; margin-left: 8px; text-decoration: line-through;">${data.appointmentDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #991B1B; font-size: 13px;">Time:</span>
                          <span style="color: #DC2626; font-size: 16px; margin-left: 8px; text-decoration: line-through;">${data.appointmentTime}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #991B1B; font-size: 13px;">Doctor:</span>
                          <span style="color: #DC2626; font-size: 16px; margin-left: 8px;">Dr. ${data.doctorName}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div style="padding: 15px; background-color: #FEF3C7; border-radius: 6px; border-left: 4px solid #F59E0B; margin-bottom: 20px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px;">
                      <strong>Reason:</strong> ${data.reason}
                    </p>
                  </div>
                  <p style="margin: 0; color: #5A6570; font-size: 14px; line-height: 1.6;">
                    Please contact us to reschedule your appointment at your earliest convenience.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Appointment Cancelled - ${data.clinicName}`,
    html,
  });
}

// Send appointment reschedule email
interface AppointmentRescheduleData {
  patientEmail: string;
  patientName: string;
  clinicName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  doctorName: string;
}

export async function sendAppointmentRescheduleEmail(
  data: AppointmentRescheduleData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Rescheduled</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #4D9DE0; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Appointment Rescheduled
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.patientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    Your appointment has been rescheduled to a new date and time.
                  </p>

                  <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <div style="flex: 1; padding: 20px; background-color: #FEF2F2; border-radius: 8px;">
                      <p style="margin: 0 0 10px; color: #991B1B; font-size: 12px; text-transform: uppercase; font-weight: 600;">Previous</p>
                      <p style="margin: 0; color: #DC2626; font-size: 14px; text-decoration: line-through;">${data.oldDate}</p>
                      <p style="margin: 0; color: #DC2626; font-size: 14px; text-decoration: line-through;">${data.oldTime}</p>
                    </div>
                  </div>

                  <div style="padding: 25px; background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px; color: #166534; font-size: 12px; text-transform: uppercase; font-weight: 600;">New Appointment</p>
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Date:</span>
                          <span style="color: #15803D; font-size: 16px; margin-left: 8px; font-weight: 600;">${data.newDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Time:</span>
                          <span style="color: #15803D; font-size: 16px; margin-left: 8px; font-weight: 600;">${data.newTime}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #166534; font-size: 13px;">Doctor:</span>
                          <span style="color: #15803D; font-size: 16px; margin-left: 8px;">Dr. ${data.doctorName}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <p style="margin: 0; color: #5A6570; font-size: 14px; line-height: 1.6;">
                    Please update your calendar accordingly. If this new time doesn't work for you, please contact us to find an alternative.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Appointment Rescheduled: ${data.newDate} at ${data.newTime} - ${data.clinicName}`,
    html,
  });
}

// ==================== INVENTORY MODULE EMAILS ====================

// Send low stock alert email
interface LowStockAlertData {
  recipientEmail: string;
  recipientName: string;
  clinicName: string;
  productName: string;
  productSku: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
}

export async function sendLowStockAlertEmail(
  data: LowStockAlertData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Low Stock Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #F59E0B; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Low Stock Alert
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.recipientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    This is an automated alert to notify you that the following product has reached low stock levels and requires attention.
                  </p>
                  <div style="padding: 25px; background-color: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #92400E; font-size: 13px;">Product:</span>
                          <span style="color: #78350F; font-size: 16px; margin-left: 8px; font-weight: 600;">${data.productName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #92400E; font-size: 13px;">SKU:</span>
                          <span style="color: #78350F; font-size: 14px; margin-left: 8px; font-family: monospace;">${data.productSku}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #92400E; font-size: 13px;">Current Stock:</span>
                          <span style="color: #DC2626; font-size: 18px; margin-left: 8px; font-weight: 700;">${data.currentStock} ${data.unit}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #92400E; font-size: 13px;">Reorder Level:</span>
                          <span style="color: #78350F; font-size: 14px; margin-left: 8px;">${data.reorderLevel} ${data.unit}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div style="padding: 15px; background-color: #FEF2F2; border-radius: 6px; border-left: 4px solid #EF4444;">
                    <p style="margin: 0; color: #991B1B; font-size: 14px;">
                      <strong>Action Required:</strong> Please reorder this item soon to avoid stockouts.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Low Stock Alert: ${data.productName} (${data.currentStock} ${data.unit} remaining) - ${data.clinicName}`,
    html,
  });
}

// Send expiry alert email
interface ExpiryAlertData {
  recipientEmail: string;
  recipientName: string;
  clinicName: string;
  products: Array<{
    name: string;
    sku: string;
    batchNumber: string;
    quantity: number;
    unit: string;
    expiryDate: string;
    daysUntilExpiry: number;
  }>;
}

export async function sendExpiryAlertEmail(
  data: ExpiryAlertData
): Promise<boolean> {
  const productsHtml = data.products
    .map(
      (p) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
            <strong style="color: #232C33;">${p.name}</strong>
            <br><span style="color: #5A6570; font-size: 13px;">SKU: ${p.sku} | Batch: ${p.batchNumber}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">
            ${p.quantity} ${p.unit}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">
            <span style="color: ${p.daysUntilExpiry <= 30 ? '#DC2626' : '#F59E0B'}; font-weight: 600;">
              ${p.expiryDate}
            </span>
            <br><span style="color: #5A6570; font-size: 12px;">${p.daysUntilExpiry} days left</span>
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stock Expiry Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #EF4444; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Stock Expiry Alert
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.recipientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    The following products are approaching their expiry dates and require your attention.
                  </p>
                  <table style="width: 100%; border-collapse: collapse; background-color: #F9FAFB; border-radius: 8px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #F3F4F6;">
                        <th style="padding: 12px; text-align: left; font-size: 12px; color: #5A6570; text-transform: uppercase;">Product</th>
                        <th style="padding: 12px; text-align: center; font-size: 12px; color: #5A6570; text-transform: uppercase;">Qty</th>
                        <th style="padding: 12px; text-align: center; font-size: 12px; color: #5A6570; text-transform: uppercase;">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${productsHtml}
                    </tbody>
                  </table>
                  <div style="margin-top: 20px; padding: 15px; background-color: #FEF2F2; border-radius: 6px; border-left: 4px solid #EF4444;">
                    <p style="margin: 0; color: #991B1B; font-size: 14px;">
                      <strong>Action Required:</strong> Review these items and take appropriate action (sell, return to supplier, or dispose of safely).
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Stock Expiry Alert: ${data.products.length} product(s) expiring soon - ${data.clinicName}`,
    html,
  });
}

// Send purchase order email to supplier
interface PurchaseOrderEmailData {
  supplierEmail: string;
  supplierName: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  expectedDeliveryDate?: string;
}

export async function sendPurchaseOrderEmail(
  data: PurchaseOrderEmailData
): Promise<boolean> {
  const itemsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
            <strong style="color: #232C33;">${item.name}</strong>
            <br><span style="color: #5A6570; font-size: 12px;">SKU: ${item.sku}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">
            ${item.quantity} ${item.unit}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">
            ${item.unitPrice.toFixed(2)}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">
            ${item.totalPrice.toFixed(2)}
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Order</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #4D9DE0; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Purchase Order
                  </h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                    ${data.orderNumber}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <table style="width: 100%; margin-bottom: 30px;">
                    <tr>
                      <td style="vertical-align: top; width: 50%;">
                        <p style="margin: 0 0 5px; color: #5A6570; font-size: 12px; text-transform: uppercase;">From</p>
                        <p style="margin: 0; color: #232C33; font-size: 14px; font-weight: 600;">${data.clinicName}</p>
                        <p style="margin: 5px 0 0; color: #5A6570; font-size: 13px;">${data.clinicAddress}</p>
                        <p style="margin: 5px 0 0; color: #5A6570; font-size: 13px;">Phone: ${data.clinicPhone}</p>
                      </td>
                      <td style="vertical-align: top; width: 50%; text-align: right;">
                        <p style="margin: 0 0 5px; color: #5A6570; font-size: 12px; text-transform: uppercase;">To</p>
                        <p style="margin: 0; color: #232C33; font-size: 14px; font-weight: 600;">${data.supplierName}</p>
                        <p style="margin: 15px 0 5px; color: #5A6570; font-size: 12px; text-transform: uppercase;">Order Date</p>
                        <p style="margin: 0; color: #232C33; font-size: 14px;">${data.orderDate}</p>
                        ${data.expectedDeliveryDate ? `
                          <p style="margin: 15px 0 5px; color: #5A6570; font-size: 12px; text-transform: uppercase;">Expected Delivery</p>
                          <p style="margin: 0; color: #232C33; font-size: 14px;">${data.expectedDeliveryDate}</p>
                        ` : ""}
                      </td>
                    </tr>
                  </table>

                  <table style="width: 100%; border-collapse: collapse; background-color: #F9FAFB; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #E5E7EB;">
                        <th style="padding: 12px; text-align: left; font-size: 12px; color: #5A6570; text-transform: uppercase;">Item</th>
                        <th style="padding: 12px; text-align: center; font-size: 12px; color: #5A6570; text-transform: uppercase;">Qty</th>
                        <th style="padding: 12px; text-align: right; font-size: 12px; color: #5A6570; text-transform: uppercase;">Unit Price</th>
                        <th style="padding: 12px; text-align: right; font-size: 12px; color: #5A6570; text-transform: uppercase;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr style="background-color: #F3F4F6;">
                        <td colspan="3" style="padding: 12px; text-align: right; color: #5A6570;">Subtotal:</td>
                        <td style="padding: 12px; text-align: right; color: #232C33;">${data.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr style="background-color: #F3F4F6;">
                        <td colspan="3" style="padding: 12px; text-align: right; color: #5A6570;">Tax:</td>
                        <td style="padding: 12px; text-align: right; color: #232C33;">${data.tax.toFixed(2)}</td>
                      </tr>
                      <tr style="background-color: #4D9DE0;">
                        <td colspan="3" style="padding: 12px; text-align: right; color: #ffffff; font-weight: 600;">Total:</td>
                        <td style="padding: 12px; text-align: right; color: #ffffff; font-weight: 700; font-size: 16px;">${data.total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  ${data.notes ? `
                    <div style="padding: 15px; background-color: #F3F4F6; border-radius: 6px;">
                      <p style="margin: 0 0 5px; color: #5A6570; font-size: 12px; text-transform: uppercase;">Notes</p>
                      <p style="margin: 0; color: #232C33; font-size: 14px;">${data.notes}</p>
                    </div>
                  ` : ""}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.supplierEmail,
    subject: `Purchase Order ${data.orderNumber} from ${data.clinicName}`,
    html,
  });
}

// Send stock received confirmation email
interface StockReceivedEmailData {
  recipientEmail: string;
  recipientName: string;
  clinicName: string;
  supplierName: string;
  invoiceNumber: string;
  receivedDate: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unit: string;
  }>;
  totalItems: number;
  receivedBy: string;
}

export async function sendStockReceivedEmail(
  data: StockReceivedEmailData
): Promise<boolean> {
  const itemsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB;">
            <span style="color: #232C33; font-weight: 500;">${item.name}</span>
            <br><span style="color: #5A6570; font-size: 12px;">SKU: ${item.sku}</span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">
            <span style="color: #17B890; font-weight: 600;">+${item.quantity} ${item.unit}</span>
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stock Received Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFF2EF;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: #17B890; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                    Stock Received
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #232C33; font-size: 20px; font-weight: 600;">
                    Hello ${data.recipientName},
                  </h2>
                  <p style="margin: 0 0 20px; color: #5A6570; font-size: 16px; line-height: 1.6;">
                    New stock has been received and added to your inventory.
                  </p>
                  <div style="padding: 20px; background-color: #F0FDF4; border-radius: 8px; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 5px 0;">
                          <span style="color: #166534; font-size: 13px;">Supplier:</span>
                          <span style="color: #15803D; font-size: 14px; margin-left: 8px; font-weight: 500;">${data.supplierName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">
                          <span style="color: #166534; font-size: 13px;">Invoice #:</span>
                          <span style="color: #15803D; font-size: 14px; margin-left: 8px;">${data.invoiceNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">
                          <span style="color: #166534; font-size: 13px;">Date Received:</span>
                          <span style="color: #15803D; font-size: 14px; margin-left: 8px;">${data.receivedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">
                          <span style="color: #166534; font-size: 13px;">Received By:</span>
                          <span style="color: #15803D; font-size: 14px; margin-left: 8px;">${data.receivedBy}</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <h3 style="margin: 0 0 15px; color: #232C33; font-size: 16px; font-weight: 600;">Items Received (${data.totalItems})</h3>
                  <table style="width: 100%; border-collapse: collapse; background-color: #F9FAFB; border-radius: 8px; overflow: hidden;">
                    ${itemsHtml}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Stock Received: ${data.totalItems} items from ${data.supplierName} - ${data.clinicName}`,
    html,
  });
}
