import nodemailer from "nodemailer";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function hasSmtpConfig() {
  return Boolean(env("SMTP_HOST") && env("SMTP_PORT") && env("SMTP_USER") && env("SMTP_PASS") && env("MAIL_FROM"));
}

function hasNotificationConfig() {
  return Boolean(hasSmtpConfig() && env("NOTIFY_EMAIL_TO"));
}

function createTransport() {
  return nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT") || 465),
    secure: env("SMTP_SECURE") !== "false",
    auth: {
      user: env("SMTP_USER"),
      pass: env("SMTP_PASS"),
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
}

function validEmail(value: string) {
  return /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(value);
}

export type EngagementEmailInput = {
  subject: string;
  headline: string;
  lines: string[];
};

export type EngagementEmailResult = {
  skipped: boolean;
  sent: boolean;
  recipients?: number;
  error?: string;
};

export type NewsletterEmailInput = EngagementEmailInput & {
  recipients: string[];
  ctaPath?: string;
};

export type DirectNotificationEmailInput = EngagementEmailInput & {
  recipient: string;
  ctaPath?: string;
};

export async function sendEngagementEmail(input: EngagementEmailInput): Promise<EngagementEmailResult> {
  if (!hasNotificationConfig()) {
    const error = "missing SMTP/notification env";
    console.warn(`[mail] notification skipped: ${error}`);
    return { skipped: true, sent: false, error };
  }

  try {
    const transporter = createTransport();
    const siteUrl = env("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
    const text = [input.headline, "", ...input.lines, "", `Site: ${siteUrl}`].join("\n");
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>${escapeHtml(input.headline)}</h2>
        ${input.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        <hr />
        <p><strong>Site:</strong> ${escapeHtml(siteUrl)}</p>
      </div>
    `;

    await transporter.sendMail({
      from: env("MAIL_FROM"),
      to: env("NOTIFY_EMAIL_TO"),
      subject: safeHeader(input.subject),
      text,
      html,
    });

    return { skipped: false, sent: true };
  } catch (error) {
    const message = error instanceof Error && error.message.trim() ? error.message : "unknown mail transport error";
    console.error(`[mail] send failed: ${message}`);
    return { skipped: false, sent: false, error: message };
  }
}

export async function sendNewsletterEmail(input: NewsletterEmailInput): Promise<EngagementEmailResult> {
  if (!hasSmtpConfig()) {
    const error = "missing SMTP env";
    console.warn(`[newsletter] skipped: ${error}`);
    return { skipped: true, sent: false, recipients: input.recipients.length, error };
  }

  const recipients = Array.from(new Set(input.recipients.map((email) => email.trim().toLowerCase()).filter(validEmail)));

  if (!recipients.length) {
    return { skipped: true, sent: false, recipients: 0, error: "no recipients" };
  }

  try {
    const transporter = createTransport();
    const siteUrl = env("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
    const ctaUrl = input.ctaPath ? new URL(input.ctaPath, siteUrl).toString() : siteUrl;
    const text = [input.headline, "", ...input.lines, "", `Acesse: ${ctaUrl}`].join("\n");
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>${escapeHtml(input.headline)}</h2>
        ${input.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        <p><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Abrir no site</a></p>
        <hr />
        <p style="color:#555;font-size:12px;">Você recebeu este aviso porque seu email está cadastrado na LBArtes Luiz.</p>
      </div>
    `;

    const batchSize = 50;
    for (let index = 0; index < recipients.length; index += batchSize) {
      const batch = recipients.slice(index, index + batchSize);
      await transporter.sendMail({
        from: env("MAIL_FROM"),
        to: env("MAIL_FROM"),
        bcc: batch,
        subject: safeHeader(input.subject),
        text,
        html,
      });
    }

    return { skipped: false, sent: true, recipients: recipients.length };
  } catch (error) {
    const message = error instanceof Error && error.message.trim() ? error.message : "unknown mail transport error";
    console.error(`[newsletter] send failed: ${message}`);
    return { skipped: false, sent: false, recipients: recipients.length, error: message };
  }
}

export async function sendDirectNotificationEmail(input: DirectNotificationEmailInput): Promise<EngagementEmailResult> {
  if (!hasSmtpConfig() || !validEmail(input.recipient)) {
    return { skipped: true, sent: false, recipients: 0, error: "missing SMTP or invalid recipient" };
  }
  try {
    const transporter = createTransport();
    const siteUrl = env("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
    const ctaUrl = input.ctaPath ? new URL(input.ctaPath, siteUrl).toString() : siteUrl;
    await transporter.sendMail({
      from: env("MAIL_FROM"),
      to: input.recipient,
      subject: safeHeader(input.subject),
      text: [input.headline, "", ...input.lines, "", `Acesse: ${ctaUrl}`].join("\n"),
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111"><h2>${escapeHtml(input.headline)}</h2>${input.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}<p><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Abrir o Pulso</a></p><hr><p style="color:#555;font-size:12px">Você ativou notificações por e-mail no Pulso. Altere essa preferência no sino de notificações do site.</p></div>`,
    });
    return { skipped: false, sent: true, recipients: 1 };
  } catch (error) {
    const message = error instanceof Error && error.message.trim() ? error.message : "unknown mail transport error";
    return { skipped: false, sent: false, recipients: 1, error: message };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
