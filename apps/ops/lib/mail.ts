import nodemailer, { type SendMailOptions } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import {
  type AuthEnvironment,
  RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
  resolveAuthTrustedOrigins,
} from "./auth-policy";

const HOSTINGER_SMTP_HOST = "smtp.hostinger.com";
const HOSTINGER_SMTP_SSL_PORT = 465;
const HOSTINGER_SMTP_STARTTLS_PORT = 587;

type MailEnvironment = AuthEnvironment & {
  [key: string]: string | undefined;
  SMTP_FROM?: string;
  SMTP_HOST?: string;
  SMTP_PASSWORD?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
};

export type PasswordResetMail = {
  to: string;
  resetUrl: string;
};

type MailTransport = {
  sendMail(message: SendMailOptions): Promise<unknown>;
};

type MailTransportFactory = (
  options: SMTPTransport.Options,
) => MailTransport;

export class MailConfigurationError extends Error {
  constructor(message = "Password reset email is not configured") {
    super(message);
    this.name = "MailConfigurationError";
  }
}

export class MailDeliveryError extends Error {
  constructor() {
    super("Password reset email could not be delivered");
    this.name = "MailDeliveryError";
  }
}

export type ResolvedSmtpConfig = {
  from: string;
  transport: SMTPTransport.Options;
};

export function resolveSmtpConfig(
  environment: MailEnvironment = process.env,
): ResolvedSmtpConfig {
  const host = environment.SMTP_HOST?.trim() || HOSTINGER_SMTP_HOST;
  const user = environment.SMTP_USER?.trim();
  const password = environment.SMTP_PASSWORD;
  const from = environment.SMTP_FROM?.trim();
  const rawPort =
    environment.SMTP_PORT?.trim() || String(HOSTINGER_SMTP_SSL_PORT);
  const rawSecure = environment.SMTP_SECURE?.trim().toLowerCase();
  const port = Number(rawPort);

  if (host !== HOSTINGER_SMTP_HOST) {
    throw new MailConfigurationError(
      "SMTP_HOST must be smtp.hostinger.com for the approved transport",
    );
  }
  if (!user || !password || !from || !rawSecure) {
    throw new MailConfigurationError();
  }
  if (
    !Number.isInteger(port) ||
    (port !== HOSTINGER_SMTP_SSL_PORT &&
      port !== HOSTINGER_SMTP_STARTTLS_PORT)
  ) {
    throw new MailConfigurationError(
      "SMTP_PORT must be 465, or 587 only after provider verification",
    );
  }

  const usesStartTls = port === HOSTINGER_SMTP_STARTTLS_PORT;
  if (
    (port === HOSTINGER_SMTP_SSL_PORT && rawSecure !== "true") ||
    (usesStartTls && rawSecure !== "false")
  ) {
    throw new MailConfigurationError(
      "SMTP_SECURE must be true for port 465 and false for port 587",
    );
  }

  return {
    from,
    transport: {
      host,
      port,
      secure: rawSecure === "true",
      requireTLS: usesStartTls,
      auth: {
        user,
        pass: password,
      },
      tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
        servername: HOSTINGER_SMTP_HOST,
      },
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function validatedResetUrl(
  value: string,
  environment: MailEnvironment,
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MailDeliveryError();
  }

  if (!resolveAuthTrustedOrigins(environment).includes(url.origin)) {
    throw new MailDeliveryError();
  }

  return url;
}

export function buildPasswordResetMessage(
  mail: PasswordResetMail,
  from: string,
  environment: MailEnvironment = process.env,
): SendMailOptions {
  const resetUrl = validatedResetUrl(mail.resetUrl, environment).toString();
  const expiryMinutes = Math.floor(
    RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS / 60,
  );
  const escapedResetUrl = escapeHtml(resetUrl);

  return {
    from,
    to: mail.to,
    subject: "Reset your Perfume Aura Ops password",
    text: [
      "A password reset was requested for your Perfume Aura Ops account.",
      "",
      `Reset your password: ${resetUrl}`,
      "",
      `This link expires in ${expiryMinutes} minutes and can be used once.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>A password reset was requested for your Perfume Aura Ops account.</p>",
      `<p><a href="${escapedResetUrl}">Reset your password</a></p>`,
      `<p>This link expires in ${expiryMinutes} minutes and can be used once.</p>`,
      "<p>If you did not request this, you can ignore this email.</p>",
    ].join(""),
  };
}

/**
 * Send through the approved Hostinger SMTP transport. Errors are deliberately
 * replaced with a stable message so credentials, provider responses, reset
 * tokens, and complete reset URLs cannot escape into application logs.
 */
export async function sendPasswordResetEmail(
  mail: PasswordResetMail,
  environment: MailEnvironment = process.env,
  createTransport: MailTransportFactory = (options) =>
    nodemailer.createTransport(options),
): Promise<void> {
  const config = resolveSmtpConfig(environment);
  const message = buildPasswordResetMessage(mail, config.from, environment);

  try {
    const transport = createTransport(config.transport);
    await transport.sendMail(message);
  } catch {
    throw new MailDeliveryError();
  }
}
