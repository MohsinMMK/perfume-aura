import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  db,
  storefrontAccount,
  storefrontRateLimit,
  storefrontSession,
  storefrontUser,
  storefrontVerification,
} from "@perfume-aura/db";
import {
  customerAuthProviderReadiness,
  resolveCustomerAuthBaseUrl,
  resolveCustomerAuthSecret,
  resolveCustomerAuthTrustedOrigins,
} from "./customer-auth-policy";
import { sendCustomerAuthEmail } from "./customer-mail";

export function createCustomerAuth() {
  const providerReadiness = customerAuthProviderReadiness();
  const socialProviders = {
    ...(providerReadiness.google
      ? {
          google: {
            clientId: process.env.CUSTOMER_GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.CUSTOMER_GOOGLE_CLIENT_SECRET as string,
          },
        }
      : {}),
    ...(providerReadiness.apple
      ? {
          apple: {
            clientId: process.env.CUSTOMER_APPLE_SERVICES_ID as string,
            clientSecret: process.env.CUSTOMER_APPLE_CLIENT_SECRET as string,
          },
        }
      : {}),
  };

  return betterAuth({
    appName: "Perfume Aura Customer",
    basePath: "/api/customer-auth",
    baseURL: resolveCustomerAuthBaseUrl(),
    trustedOrigins: [...resolveCustomerAuthTrustedOrigins()],
    secret: resolveCustomerAuthSecret(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: storefrontUser,
        session: storefrontSession,
        account: storefrontAccount,
        verification: storefrontVerification,
        rateLimit: storefrontRateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 256,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendCustomerAuthEmail({ to: user.email, actionUrl: url, purpose: "reset" });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendCustomerAuthEmail({ to: user.email, actionUrl: url, purpose: "verify" });
      },
    },
    socialProviders,
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        requireLocalEmailVerified: true,
        trustedProviders: ["google", "apple"],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
    },
    user: {
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60,
        sendDeleteAccountVerification: async ({ user, url }) => {
          await sendCustomerAuthEmail({ to: user.email, actionUrl: url, purpose: "delete" });
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: "pa_customer",
      useSecureCookies: process.env.NODE_ENV === "production",
      disableCSRFCheck: false,
      disableOriginCheck: false,
      crossSubDomainCookies: { enabled: false },
    },
    plugins: [nextCookies()],
  });
}

export type CustomerAuth = ReturnType<typeof createCustomerAuth>;
