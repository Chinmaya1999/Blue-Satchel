import nodemailer from "nodemailer";

/**
 * Outgoing email over SMTP (Google Workspace: smtp.gmail.com:465 with an app
 * password — see .env). One pooled transport is reused for every message.
 */
let transport;
const getTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email isn't configured (SMTP_HOST / SMTP_USER / SMTP_PASS).");
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (Number(process.env.SMTP_PORT) || 465) === 465,
    pool: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
};

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const sendMail = ({ to, subject, text, html }) =>
  getTransport().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });

/** Welcome email carrying the 6-digit verification code. */
export const sendVerificationEmail = ({ to, name, code, expiresInMinutes, welcome = true }) => {
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";
  const heading = welcome ? `Welcome to DXB BEAUTY, ${firstName}!` : `Here's your new code, ${firstName}`;
  const intro = welcome
    ? "Thanks for creating your account. Enter this code on the sign-up page to verify your email and start your AI skin analysis."
    : "Enter this code on the verification page to finish verifying your email.";

  const text = [
    heading,
    "",
    intro,
    "",
    `Your verification code: ${code}`,
    `It expires in ${expiresInMinutes} minutes.`,
    "",
    "If you didn't create a DXB BEAUTY account, you can ignore this email.",
  ].join("\n");

  const digits = String(code)
    .split("")
    .map(
      (d) =>
        `<td style="width:44px;height:54px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;font:700 26px/54px 'Courier New',monospace;color:#0f172a;text-align:center;">${d}</td>`
    )
    .join('<td style="width:8px;"></td>');

  const html = `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#050814;padding:22px 28px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;">DXB BEAUTY</span>
          <span style="font-size:12px;color:#67e8f9;margin-left:8px;">AI skin analysis</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">${escapeHtml(intro)}</p>
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Your verification code</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
          <p style="margin:18px 0 0;font-size:13px;color:#64748b;">This code expires in ${expiresInMinutes} minutes. Never share it with anyone.</p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#94a3b8;">
          If you didn't create a DXB BEAUTY account, you can safely ignore this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return sendMail({
    to,
    subject: welcome ? `Welcome to DXB BEAUTY — your code is ${code}` : `Your DXB BEAUTY verification code: ${code}`,
    text,
    html,
  });
};

/** Email carrying the 6-digit password reset code. */
export const sendPasswordResetEmail = ({ to, name, code, expiresInMinutes }) => {
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";
  const text = [
    `Hi ${firstName},`,
    "",
    "We received a request to reset your DXB BEAUTY password.",
    `Your reset code: ${code}`,
    `It expires in ${expiresInMinutes} minutes. Never share it with anyone.`,
    "",
    "If you didn't ask for this, you can ignore this email; your password won't change.",
  ].join("\n");

  const digits = String(code)
    .split("")
    .map(
      (d) =>
        `<td style="width:44px;height:54px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;font:700 26px/54px 'Courier New',monospace;color:#0f172a;text-align:center;">${d}</td>`
    )
    .join('<td style="width:8px;"></td>');

  const html = `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#050814;padding:22px 28px;"><span style="font-size:20px;font-weight:700;color:#ffffff;">DXB BEAUTY</span></td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-size:22px;">Reset your password</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">Hi ${escapeHtml(firstName)}, enter this code on the reset page to choose a new password.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
          <p style="margin:18px 0 0;font-size:13px;color:#64748b;">This code expires in ${expiresInMinutes} minutes. Never share it with anyone.</p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">If you didn't request this, you can safely ignore this email.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return sendMail({ to, subject: `Your DXB BEAUTY password reset code: ${code}`, text, html });
};
