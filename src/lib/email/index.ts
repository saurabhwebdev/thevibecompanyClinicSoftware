import nodemailer from "nodemailer";

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
