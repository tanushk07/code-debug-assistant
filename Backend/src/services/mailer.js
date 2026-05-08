const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
//  Email transport — uses Gmail SMTP via App Password.
//  Falls back to console logging in dev when SMTP creds are missing.
// ---------------------------------------------------------------------------

let transporter = null;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify the connection at startup (non-blocking).
  transporter.verify().then(() => {
    console.log('✉ SMTP transport ready');
  }).catch((err) => {
    console.warn(`⚠ SMTP verification failed: ${err.message}`);
  });
} else {
  console.warn('⚠ SMTP_USER / SMTP_PASS not set — verification codes will be logged to console only.');
}

const SENDER_NAME = process.env.SMTP_SENDER_NAME || 'Code Debug Assistant';

/**
 * Send a 6-digit verification code to the given email address.
 * In dev mode (no SMTP), the code is logged to the console instead.
 */
async function sendVerificationCode(email, code) {
  if (!transporter) {
    console.log(`\n🔑  DEV-MODE verification code for ${email}: ${code}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `${code} — Your verification code`,
    html: `
      <div style="font-family: 'Courier New', monospace; max-width: 480px; margin: 0 auto; padding: 32px; border: 3px solid #000; background: #fff;">
        <h2 style="margin: 0 0 8px; font-size: 20px; letter-spacing: 2px;">VERIFICATION CODE</h2>
        <p style="margin: 0 0 24px; color: #666; font-size: 14px;">Enter this code to complete your sign-up.</p>
        <div style="font-size: 36px; letter-spacing: 12px; font-weight: bold; text-align: center; padding: 16px; background: #f5f5f5; border: 2px solid #000; margin-bottom: 24px;">
          ${code}
        </div>
        <p style="margin: 0; color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationCode };
