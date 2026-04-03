import { Resend } from "resend";

// ─── Resend Client (lazy init) ───────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "The North <onboarding@resend.dev>";

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

// ─── Password Reset Email ────────────────────────────────────

export async function sendPasswordResetEmail(input: {
  to: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${input.token}`;

  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Reset your password — The North",
    html: buildPasswordResetHtml(resetUrl),
    text: buildPasswordResetText(resetUrl),
  });
}

// ─── Welcome Email ───────────────────────────────────────────

export async function sendWelcomeEmail(input: {
  to: string;
  name: string;
}): Promise<void> {
  const loginUrl = `${getBaseUrl()}/login`;

  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Welcome to The North",
    html: buildWelcomeHtml(input.name, loginUrl),
    text: buildWelcomeText(input.name, loginUrl),
  });
}

// ─── Payment Failure Email ───────────────────────────────────

export async function sendPaymentFailureEmail(input: {
  to: string;
  name: string;
  amountFormatted: string;
}): Promise<void> {
  const billingUrl = `${getBaseUrl()}/dashboard/billing`;

  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Payment failed — action required",
    html: buildPaymentFailureHtml(
      input.name,
      input.amountFormatted,
      billingUrl
    ),
    text: buildPaymentFailureText(
      input.name,
      input.amountFormatted,
      billingUrl
    ),
  });
}

// ─── Template Builders ───────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
  ${content}
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
  <p style="color: #999; font-size: 12px;">The North &mdash; Managed Google Ads</p>
</body>
</html>`;
}

function buildPasswordResetHtml(resetUrl: string): string {
  return emailWrapper(`
    <h2 style="color: #111; margin-bottom: 24px;">Reset your password</h2>
    <p style="color: #555; line-height: 1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
      This link expires in 1 hour.
    </p>
    <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0; font-weight: 500;">
      Reset password
    </a>
    <p style="color: #999; font-size: 14px;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `);
}

function buildPasswordResetText(resetUrl: string): string {
  return `Reset your password

We received a request to reset your password. Visit the link below to choose a new one (expires in 1 hour):

${resetUrl}

If you didn't request this, you can safely ignore this email.

— The North — Managed Google Ads`;
}

function buildWelcomeHtml(name: string, loginUrl: string): string {
  return emailWrapper(`
    <h2 style="color: #111; margin-bottom: 24px;">Welcome to The North</h2>
    <p style="color: #555; line-height: 1.6;">
      Hi ${name},
    </p>
    <p style="color: #555; line-height: 1.6;">
      Thanks for signing up! We're excited to help you grow your business with Google Ads.
      Complete your onboarding questionnaire and we'll get your campaigns set up.
    </p>
    <a href="${loginUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0; font-weight: 500;">
      Go to your account
    </a>
    <p style="color: #999; font-size: 14px;">
      If you have any questions, just reply to this email.
    </p>
  `);
}

function buildWelcomeText(name: string, loginUrl: string): string {
  return `Welcome to The North

Hi ${name},

Thanks for signing up! We're excited to help you grow your business with Google Ads. Complete your onboarding questionnaire and we'll get your campaigns set up.

Go to your account: ${loginUrl}

If you have any questions, just reply to this email.

— The North — Managed Google Ads`;
}

function buildPaymentFailureHtml(
  name: string,
  amountFormatted: string,
  billingUrl: string
): string {
  return emailWrapper(`
    <h2 style="color: #111; margin-bottom: 24px;">Payment failed</h2>
    <p style="color: #555; line-height: 1.6;">
      Hi ${name},
    </p>
    <p style="color: #555; line-height: 1.6;">
      We were unable to process your payment of <strong>${amountFormatted}</strong>.
      Please update your payment method to avoid any interruption to your campaigns.
    </p>
    <a href="${billingUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0; font-weight: 500;">
      Update payment method
    </a>
    <p style="color: #999; font-size: 14px;">
      If you believe this is an error, please contact us.
    </p>
  `);
}

function buildPaymentFailureText(
  name: string,
  amountFormatted: string,
  billingUrl: string
): string {
  return `Payment failed

Hi ${name},

We were unable to process your payment of ${amountFormatted}. Please update your payment method to avoid any interruption to your campaigns.

Update payment method: ${billingUrl}

If you believe this is an error, please contact us.

— The North — Managed Google Ads`;
}
