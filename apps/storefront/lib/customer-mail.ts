import nodemailer, { type SendMailOptions } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { resolveCustomerAuthTrustedOrigins } from "./customer-auth-policy";

type CustomerMailEnvironment = Record<string, string | undefined> & {
  CUSTOMER_INQUIRY_NOTIFICATION_TO?: string;
  CUSTOMER_SMTP_FROM?: string;
  CUSTOMER_SMTP_HOST?: string;
  CUSTOMER_SMTP_PASSWORD?: string;
  CUSTOMER_SMTP_PORT?: string;
  CUSTOMER_SMTP_SECURE?: string;
  CUSTOMER_SMTP_USER?: string;
};

function notificationRecipient(environment: CustomerMailEnvironment): string {
  const recipient = environment.CUSTOMER_INQUIRY_NOTIFICATION_TO?.trim();
  if (
    !recipient ||
    recipient.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
  ) {
    throw new Error("Inquiry notification recipient is not configured");
  }
  return recipient;
}

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

const orderMailLabels = {
  order_confirmed: ["Your Perfume Aura order is confirmed", "Payment confirmed. We are preparing your order."],
  order_shipped: ["Your Perfume Aura order has shipped", "Your order is on its way."],
  order_delivered: ["Your Perfume Aura order was delivered", "Your order has been marked delivered."],
  order_cancelled: ["Your Perfume Aura order was cancelled", "Your order was cancelled. Contact support if you need help."],
  refund_succeeded: ["Your Perfume Aura refund is complete", "Cashfree has confirmed your refund."],
  refund_processing: ["Your Perfume Aura refund is processing", "Your refund request was accepted and is being processed."],
  refund_failed: ["Your Perfume Aura refund needs attention", "The refund could not be completed. Our support team can help."],
} as const;

export type OrderMailKind = keyof typeof orderMailLabels;

export async function sendCommerceOrderEmail(
  input: Readonly<{
    to: string;
    kind: OrderMailKind;
    orderNumber: string;
    orderUrl: string;
    details?: string;
  }>,
  environment: CustomerMailEnvironment = process.env,
): Promise<void> {
  const orderUrl = verifiedActionUrl(input.orderUrl, environment).toString();
  const transport = resolveTransport(environment);
  const [subject, summary] = orderMailLabels[input.kind];
  const details = input.details?.trim();
  const text = [summary, `Order: ${input.orderNumber}`, details, `View order: ${orderUrl}`]
    .filter(Boolean).join("\n\n");
  const html = `<p>${escaped(summary)}</p><p>Order: ${escaped(input.orderNumber)}</p>${details ? `<p>${escaped(details)}</p>` : ""}<p><a href="${escaped(orderUrl)}">View order</a></p>`;
  try {
    await nodemailer.createTransport(transport.options).sendMail({
      from: transport.from,
      to: input.to,
      subject,
      text,
      html,
    });
  } catch {
    throw new Error("Customer order email could not be delivered");
  }
}

export async function sendInquiryNotification(
  input: Readonly<{
    businessName: string | null;
    email: string;
    kind: "contact" | "wholesale";
    message: string;
    name: string;
  }>,
  environment: CustomerMailEnvironment = process.env,
): Promise<void> {
  const transport = resolveTransport(environment);
  const recipient = notificationRecipient(environment);
  const kindLabel = input.kind === "wholesale" ? "Wholesale" : "Contact";
  const lines = [
    `${kindLabel} inquiry received`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.businessName ? `Business: ${input.businessName}` : null,
    "",
    input.message,
  ].filter((line): line is string => line !== null);
  try {
    await nodemailer.createTransport(transport.options).sendMail({
      from: transport.from,
      to: recipient,
      replyTo: input.email,
      subject: `Perfume Aura ${kindLabel.toLowerCase()} inquiry`,
      text: lines.join("\n"),
      html: lines.map((line) => line ? `<p>${escaped(line)}</p>` : "<br>").join(""),
    });
  } catch {
    throw new Error("Inquiry notification could not be delivered");
  }
}
