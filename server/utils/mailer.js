const nodemailer = require("nodemailer");

// Built lazily so a missing config doesn't crash the server at startup -
// it only matters once something actually tries to send an email.
// Uses Brevo's SMTP relay (https://app.brevo.com -> SMTP & API -> SMTP).
let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;

  const login = process.env.BREVO_SMTP_LOGIN;
  const key = process.env.BREVO_SMTP_KEY;
  if (!login || !key) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // STARTTLS on 587
    auth: { user: login, pass: key },
  });
  return transporter;
}

// Sends an email; returns true if it was handed off to the SMTP server.
// Never throws - a mail failure should not break the caller's request flow,
// it should just be logged so the issue is visible in the server console.
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.warn(
      `⚠️  Email not sent (set BREVO_SMTP_LOGIN / BREVO_SMTP_KEY in server/.env): "${subject}" -> ${to}`,
    );
    return false;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_SMTP_LOGIN;
  const senderName = process.env.BREVO_SENDER_NAME || "SRI.CR";

  try {
    await t.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    return false;
  }
}

module.exports = { sendMail };
