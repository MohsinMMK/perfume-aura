type OpsSecurityEnvironment = {
  OPS_STAFF_INVITES_ENABLED?: string;
  OPS_TWO_FACTOR_REQUIRED?: string;
};

/** Only the literal string `true` enables a release-gated security feature. */
function isEnabled(value: string | undefined): boolean {
  return value === "true";
}

export function isOpsTwoFactorRequired(
  environment: OpsSecurityEnvironment = {
    OPS_TWO_FACTOR_REQUIRED: process.env.OPS_TWO_FACTOR_REQUIRED,
  },
): boolean {
  return isEnabled(environment.OPS_TWO_FACTOR_REQUIRED);
}

export function areOpsStaffInvitesEnabled(
  environment: OpsSecurityEnvironment = {
    OPS_STAFF_INVITES_ENABLED: process.env.OPS_STAFF_INVITES_ENABLED,
  },
): boolean {
  return isEnabled(environment.OPS_STAFF_INVITES_ENABLED);
}
