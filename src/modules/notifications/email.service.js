import axios from "axios";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

const sendEmail = async ({ to, subject, htmlContent }) => {
  if (!process.env.BREVO_API_KEY) {
    // Dev fallback — log to console so OTP is still visible during development
    console.log(`\n📧 [EMAIL DEV] To: ${to} | Subject: ${subject}`);
    console.log(`📬 OTP visible in console (no BREVO_API_KEY set)`);
    // Extract OTP from html for convenience
    const otpMatch = htmlContent.match(/\d{6}/);
    if (otpMatch) console.log(`🔑 OTP: ${otpMatch[0]}\n`);
    return;
  }

  try {
    await axios.post(
      BREVO_URL,
      {
        sender: {
          name:  process.env.SENDER_NAME  || "Alumni Connect",
          email: process.env.SENDER_EMAIL || "noreply@alumniconnect.com",
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      },
      {
        headers: {
          "api-key":     process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );
  } catch (error) {
    console.error(`\n❌ [EMAIL ERROR] Failed to send to ${to}:`, error.response?.data || error.message);
    // Log the OTP as fallback so dev isn't blocked
    const otpMatch = htmlContent.match(/\d{6}/);
    if (otpMatch) console.log(`🔑 [FALLBACK OTP] ${otpMatch[0]} (for ${to})\n`);
    // Don't re-throw — email failure shouldn't crash the registration
  }
};

export const sendOtpEmail = (email, otp) =>
  sendEmail({
    to: email,
    subject: "Verify Your Email — Alumni Connect",
    htmlContent: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#f1f5f9;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:24px;color:#fff">Alumni Connect</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8)">Email Verification</p>
        </div>
        <div style="padding:32px">
          <p style="color:#94a3b8;margin-top:0">Use the code below to verify your email. It expires in <strong style="color:#f1f5f9">10 minutes</strong>.</p>
          <div style="background:#1e293b;border:2px solid #6366f1;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#6366f1">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });

export const sendPasswordResetEmail = (email, otp) =>
  sendEmail({
    to: email,
    subject: "Reset Your Password — Alumni Connect",
    htmlContent: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#f1f5f9;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:24px;color:#fff">Alumni Connect</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8)">Password Reset</p>
        </div>
        <div style="padding:32px">
          <p style="color:#94a3b8;margin-top:0">Use the code below to reset your password. It expires in <strong style="color:#f1f5f9">10 minutes</strong>.</p>
          <div style="background:#1e293b;border:2px solid #f59e0b;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#f59e0b">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:13px">If you didn't request this, your account may be at risk. Consider changing your password.</p>
        </div>
      </div>
    `,
  });
