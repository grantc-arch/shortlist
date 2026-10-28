import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends email through any SMTP server: Gmail with an app password, or a provider
 * such as Resend or Brevo once you have your own domain. See README.
 */
export function emailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && fromAddress());
}

/**
 * Who emails come from: EMAIL_FROM, or the SMTP login when that's an email address
 * (as with Gmail). Some providers use a plain username, so EMAIL_FROM is needed there.
 */
function fromAddress(): string | null {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  const user = process.env.SMTP_USER ?? "";
  return user.includes("@") ? `Shortlist <${user}>` : null;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(email: Email): Promise<void> {
  if (!emailConfigured()) {
    // Without email set up, print the message so links can still be tested locally.
    console.log(`\n--- Email not sent (SMTP isn't set up) ---\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n---\n`);
    return;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: fromAddress()!,
    ...email,
  });
}
