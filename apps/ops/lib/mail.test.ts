import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPasswordResetMessage,
  MailConfigurationError,
  MailDeliveryError,
  resolveSmtpConfig,
  sendPasswordResetEmail,
} from "./mail";

const sslEnvironment = {
  NODE_ENV: "production",
  SMTP_HOST: "smtp.hostinger.com",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "ops@example.com",
  SMTP_PASSWORD: "not-a-real-secret",
  SMTP_FROM: "Perfume Aura Ops <ops@example.com>",
};

describe("Hostinger SMTP configuration", () => {
  it("uses implicit TLS on the primary Hostinger port", () => {
    const config = resolveSmtpConfig(sslEnvironment);
    assert.equal(config.transport.host, "smtp.hostinger.com");
    assert.equal(config.transport.port, 465);
    assert.equal(config.transport.secure, true);
    assert.equal(config.transport.requireTLS, false);
    assert.equal(config.transport.tls?.rejectUnauthorized, true);
    assert.equal(config.transport.logger, false);
    assert.equal(config.transport.debug, false);
  });

  it("permits only explicit STARTTLS fallback settings", () => {
    const config = resolveSmtpConfig({
      ...sslEnvironment,
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
    });
    assert.equal(config.transport.secure, false);
    assert.equal(config.transport.requireTLS, true);

    assert.throws(
      () =>
        resolveSmtpConfig({
          ...sslEnvironment,
          SMTP_PORT: "587",
          SMTP_SECURE: "true",
        }),
      MailConfigurationError,
    );
    assert.throws(
      () =>
        resolveSmtpConfig({
          ...sslEnvironment,
          SMTP_HOST: "smtp.example.com",
        }),
      MailConfigurationError,
    );
  });
});

describe("password-reset email boundary", () => {
  it("creates text plus escaped minimal HTML for an approved reset URL", () => {
    const message = buildPasswordResetMessage(
      {
        to: "owner@example.com",
        resetUrl:
          "https://app.perfumeaura.com/reset-password?token=a%26b",
      },
      sslEnvironment.SMTP_FROM,
      sslEnvironment,
    );

    assert.match(String(message.text), /expires in 30 minutes/);
    assert.match(String(message.html), /a%26b/);
    assert.doesNotMatch(String(message.html), /<script/i);
  });

  it("rejects reset URLs outside the explicit auth origins", () => {
    assert.throws(
      () =>
        buildPasswordResetMessage(
          {
            to: "owner@example.com",
            resetUrl: "https://evil.example/reset-password?token=secret",
          },
          sslEnvironment.SMTP_FROM,
          sslEnvironment,
        ),
      MailDeliveryError,
    );
  });

  it("keeps production and development reset origins separate", () => {
    assert.throws(
      () =>
        buildPasswordResetMessage(
          {
            to: "owner@example.com",
            resetUrl: "http://localhost:3000/reset-password?token=secret",
          },
          sslEnvironment.SMTP_FROM,
          sslEnvironment,
        ),
      MailDeliveryError,
    );

    assert.throws(
      () =>
        buildPasswordResetMessage(
          {
            to: "owner@example.com",
            resetUrl:
              "https://app.perfumeaura.com/reset-password?token=secret",
          },
          sslEnvironment.SMTP_FROM,
          { ...sslEnvironment, NODE_ENV: "test" },
        ),
      MailDeliveryError,
    );

    assert.doesNotThrow(() =>
      buildPasswordResetMessage(
        {
          to: "owner@example.com",
          resetUrl: "http://127.0.0.1:3000/reset-password?token=local",
        },
        sslEnvironment.SMTP_FROM,
        { ...sslEnvironment, NODE_ENV: "test" },
      ),
    );
  });

  it("redacts provider failures and never includes reset tokens", async () => {
    const token = "top-secret-reset-token";
    await assert.rejects(
      () =>
        sendPasswordResetEmail(
          {
            to: "owner@example.com",
            resetUrl: `https://app.perfumeaura.com/reset-password?token=${token}`,
          },
          sslEnvironment,
          () => ({
            sendMail: async () => {
              throw new Error(`provider failed for ${token}`);
            },
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof MailDeliveryError);
        assert.doesNotMatch(error.message, new RegExp(token));
        return true;
      },
    );
  });
});
