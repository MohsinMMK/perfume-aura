import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import {
  account,
  db,
  rateLimit,
  session,
  twoFactor as twoFactorTable,
  user,
  verification,
} from "@perfume-aura/db";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  DEFAULT_USER_ROLE,
  OWNER_ROLE,
  STAFF_ROLE,
  RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
  resolveAuthBaseUrl,
  resolveAuthTrustedOrigins,
} from "./auth-policy";
import { resolveAuthSecret } from "./auth-secret";
import { sendPasswordResetEmail } from "./mail";
import { isOpsTwoFactorRequired } from "./ops-security-policy";
import { markStaffInvitationAccepted } from "./staff-invitation-events";

const baseURL = resolveAuthBaseUrl();
const trustedOrigins = resolveAuthTrustedOrigins();

type AuthDependencies = {
  deliverPasswordResetEmail: typeof sendPasswordResetEmail;
};

const defaultAuthDependencies: AuthDependencies = {
  deliverPasswordResetEmail: sendPasswordResetEmail,
};

/**
 * Better Auth server (owner-only, no public sign-up).
 * Aligns with better-auth-best-practices + better-auth-security-best-practices.
 * Prefer BETTER_AUTH_URL / BETTER_AUTH_SECRET env (see .env.example).
 */
export function createAuth(
  dependencies: AuthDependencies = defaultAuthDependencies,
) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user,
        session,
        account,
        verification,
        rateLimit,
        twoFactor: twoFactorTable,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
      maxPasswordLength: AUTH_PASSWORD_MAX_LENGTH,
      resetPasswordTokenExpiresIn:
        RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: resetUser, url }) => {
        await dependencies.deliverPasswordResetEmail({
          to: resetUser.email,
          resetUrl: url,
        });
      },
      onPasswordReset: async ({ user: resetUser }) => {
        await markStaffInvitationAccepted(resetUser.id);
      },
    },
    secret: resolveAuthSecret(),
    baseURL,
    trustedOrigins: [...trustedOrigins],
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 1 },
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
        "/change-password": { window: 60, max: 5 },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    /**
     * Operations never exposes Better Auth's broad admin mutations directly.
     * Server-side invite/deactivation workflows use auth.api and append their
     * own immutable audit events. Enforced 2FA also removes the public disable
     * endpoint, so a protected user cannot bypass it with a raw request.
     */
    disabledPaths: [
      "/admin/ban-user",
      "/admin/create-user",
      "/admin/impersonate-user",
      "/admin/remove-user",
      "/admin/revoke-user-sessions",
      "/admin/set-role",
      "/admin/stop-impersonating",
      "/admin/unban-user",
      ...(isOpsTwoFactorRequired() ? ["/two-factor/disable"] : []),
    ],
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      disableCSRFCheck: false,
      disableOriginCheck: false,
      crossSubDomainCookies: {
        enabled: false,
      },
      backgroundTasks: {
        /**
         * Hostinger runs a long-lived Node process, so SMTP work can complete on
         * the active event loop without delaying the enumeration-safe response.
         */
        handler: (task) => {
          void task.catch(() => {
            // The mail boundary already converts failures to a redacted error.
          });
        },
      },
    },
    plugins: [
      admin({
        adminRoles: [OWNER_ROLE],
        defaultRole: DEFAULT_USER_ROLE,
        roles: {
          [OWNER_ROLE]: adminAc,
          [STAFF_ROLE]: userAc,
          [DEFAULT_USER_ROLE]: userAc,
        },
      }),
      twoFactor({
        issuer: "Perfume Aura Ops",
        trustDeviceMaxAge: 60 * 60 * 24 * 30,
      }),
      nextCookies(),
    ],
  });
}

export const auth = createAuth();
