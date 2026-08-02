import nodemailer, { type SendMailOptions } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { resolveCustomerAuthTrustedOrigins } from "./customer-auth-policy";

type CustomerMailEnvironment = Record<string, string | undefined> & {
  CUSTOMER_SMTP_FROM?: string;
  CUSTOMER_SMTP_HOST?: string;
  CUSTOMER_SMTP_PASSWORD?: string;
  CUSTOMER_SMTP_PORT?: string;
  CUSTOMER_SMTP_SECURE?: string;
  CUSTOMER_SMTP_USER?: string;
};

function escaped(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function verifiedActionUrl(
  value: string,
  environment: CustomerMailEnvironment,
): URL {
  const url = new URL(value);
  if (!resolveCustomerAuthTrustedOrigins(environment).includes(url.origin)) {
    throw new Error("Customer authentication email URL has an untrusted origin");
  }
  return url;
}

function resolveTransport(environment: CustomerMailEnvironment): Readonly<{
  from: string;
  options: SMTPTransport.Options;
}> {
  const host = environment.CUSTOMER_SMTP_HOST;
  const port = Number(environment.CUSTOMER_SMTP_PORT);
  const secure = environment.CUSTOMER_SMTP_SECURE === "true";
  const user = environment.CUSTOMER_SMTP_USER;
  const pass = environment.CUSTOMER_SMTP_PASSWORD;
  const from = environment.CUSTOMER_SMTP_FROM;
  if (
    host !== "smtp.hostinger.com" ||
    port !== 465 ||
    !secure ||
    !user ||
    !pass ||
    !from
  ) {
    throw new Error("Customer email is not configured for approved Hostinger SMTP");
  }
  return {
    from,
    options: {
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true, servername: host },
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    },
  };
}

export async function sendCustomerAuthEmail(
  input: Readonly<{
    to: string;
    actionUrl: string;
    purpose: "verify" | "reset" | "delete";
  }>,
  environment: CustomerMailEnvironment = process.env,
): Promise<void> {
  const actionUrl = verifiedActionUrl(input.actionUrl, environment).toString();
  const transport = resolveTransport(environment);
  const labels = {
    verify: ["Verify your Perfume Aura email", "Verify email"],
    reset: ["Reset your Perfume Aura password", "Reset password"],
    delete: ["Confirm Perfume Aura account deletion", "Confirm deletion"],
  } as const;
  const [subject, actionLabel] = labels[input.purpose];
  const message: SendMailOptions = {
    from: transport.from,
    to: input.to,
    subject,
    text: `${actionLabel}: ${actionUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p><a href="${escaped(actionUrl)}">${actionLabel}</a></p><p>If you did not request this, ignore this email.</p>`,
  };
  try {
    await nodemailer.createTransport(transport.options).sendMail(message);
  } catch {
    throw new Error("Customer authentication email could not be delivered");
  }
}
