import { createPrivateKey, X509Certificate } from "node:crypto";
import { isIP } from "node:net";
import type { PoolConfig } from "pg";

const tlsEnvironmentNames = {
  ca: "DATABASE_TLS_CA_PEM_BASE64",
  certificate: "DATABASE_TLS_CERT_PEM_BASE64",
  key: "DATABASE_TLS_KEY_PEM_BASE64",
  serverName: "DATABASE_TLS_SERVER_NAME",
} as const;

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const pemBlockPattern = /-----BEGIN ([A-Z0-9 ]+)-----\n([A-Za-z0-9+/=\n]+?)\n-----END \1-----\n?/g;

type TlsEnvironmentName =
  (typeof tlsEnvironmentNames)[keyof typeof tlsEnvironmentNames];

type PemBlock = {
  label: string;
  value: string;
};

function tlsConfigurationError(message: string): Error {
  return new Error(`Invalid database TLS configuration: ${message}`);
}

function optionalEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  name: TlsEnvironmentName,
): string | undefined {
  const value = environment[name]?.trim();
  return value || undefined;
}

function decodeBase64Pem(value: string, name: TlsEnvironmentName): string {
  if (value.length === 0 || value.length % 4 !== 0 || !base64Pattern.test(value)) {
    throw tlsConfigurationError(`${name} must be a canonical base64-encoded PEM value`);
  }

  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 0 || decoded.toString("base64") !== value) {
    throw tlsConfigurationError(`${name} must be a canonical base64-encoded PEM value`);
  }

  const pem = decoded.toString("utf8");
  if (Buffer.from(pem, "utf8").toString("base64") !== value) {
    throw tlsConfigurationError(`${name} must encode UTF-8 PEM text`);
  }

  return pem;
}

function parsePemBlocks(value: string, name: TlsEnvironmentName): PemBlock[] {
  const normalizedValue = value.replace(/\r\n/g, "\n");
  const blocks: PemBlock[] = [];
  let parsedLength = 0;

  for (const match of normalizedValue.matchAll(pemBlockPattern)) {
    if (match.index !== parsedLength) {
      throw tlsConfigurationError(`${name} must contain PEM blocks only`);
    }

    const label = match[1];
    const base64Body = match[2].replaceAll("\n", "");
    if (
      base64Body.length === 0 ||
      base64Body.length % 4 !== 0 ||
      !base64Pattern.test(base64Body)
    ) {
      throw tlsConfigurationError(`${name} contains an invalid PEM block`);
    }

    const blockValue = match[0];
    blocks.push({ label, value: blockValue });
    parsedLength += blockValue.length;
  }

  if (blocks.length === 0 || parsedLength !== normalizedValue.length) {
    throw tlsConfigurationError(`${name} must contain PEM blocks only`);
  }

  return blocks;
}

function validateCertificatePem(value: string, name: TlsEnvironmentName): string {
  const blocks = parsePemBlocks(value, name);
  if (blocks.some((block) => block.label !== "CERTIFICATE")) {
    throw tlsConfigurationError(`${name} must contain X.509 CERTIFICATE PEM blocks`);
  }

  for (const block of blocks) {
    try {
      void new X509Certificate(block.value);
    } catch {
      throw tlsConfigurationError(`${name} must contain valid X.509 certificate PEM blocks`);
    }
  }

  return value.replace(/\r\n/g, "\n");
}

function validatePrivateKeyPem(value: string): string {
  const name = tlsEnvironmentNames.key;
  const blocks = parsePemBlocks(value, name);
  const supportedLabels = new Set([
    "PRIVATE KEY",
    "RSA PRIVATE KEY",
    "EC PRIVATE KEY",
  ]);

  if (blocks.length !== 1 || !supportedLabels.has(blocks[0].label)) {
    throw tlsConfigurationError(
      `${name} must contain exactly one unencrypted private-key PEM block`,
    );
  }

  try {
    void createPrivateKey(blocks[0].value);
  } catch {
    throw tlsConfigurationError(`${name} must contain a valid private-key PEM block`);
  }

  return value.replace(/\r\n/g, "\n");
}

function validateClientCertificateKeyPair(
  certificatePem: string,
  privateKeyPem: string,
): void {
  const certificateBlocks = parsePemBlocks(
    certificatePem,
    tlsEnvironmentNames.certificate,
  );
  const leafCertificate = new X509Certificate(certificateBlocks[0].value);
  if (leafCertificate.ca) {
    throw tlsConfigurationError(
      `${tlsEnvironmentNames.certificate} must begin with an end-entity client certificate`,
    );
  }

  if (!leafCertificate.checkPrivateKey(createPrivateKey(privateKeyPem))) {
    throw tlsConfigurationError(
      `${tlsEnvironmentNames.certificate} and ${tlsEnvironmentNames.key} must form a matching key pair`,
    );
  }
}

function validateServerName(value: string): string {
  if (isIP(value) !== 0 || value.length > 253 || value.length === 0) {
    throw tlsConfigurationError(
      `${tlsEnvironmentNames.serverName} must be a DNS hostname, not an IP address`,
    );
  }

  const labels = value.split(".");
  const validLabels = labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label),
  );

  if (!validLabels) {
    throw tlsConfigurationError(
      `${tlsEnvironmentNames.serverName} must be a valid DNS hostname`,
    );
  }

  return value;
}

function rejectSslUrlParameters(connectionString: string): void {
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw tlsConfigurationError("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") {
    throw tlsConfigurationError("DATABASE_URL must use postgres:// or postgresql://");
  }

  for (const parameterName of databaseUrl.searchParams.keys()) {
    if (parameterName.toLowerCase().startsWith("ssl")) {
      throw tlsConfigurationError(
        "DATABASE_URL must not include SSL query parameters when explicit database TLS credentials are configured",
      );
    }
  }
}

/**
 * Resolves opt-in mutual TLS for the self-hosted PgBouncer endpoint. Existing
 * local and Neon connection URLs retain node-postgres' normal handling when
 * none of the TLS variables is configured.
 */
export function resolveRuntimeDatabaseTlsOptions(
  connectionString: string,
  environment: NodeJS.ProcessEnv = process.env,
): Pick<PoolConfig, "ssl" | "sslnegotiation"> {
  const ca = optionalEnvironmentValue(environment, tlsEnvironmentNames.ca);
  const certificate = optionalEnvironmentValue(
    environment,
    tlsEnvironmentNames.certificate,
  );
  const key = optionalEnvironmentValue(environment, tlsEnvironmentNames.key);
  const serverName = optionalEnvironmentValue(
    environment,
    tlsEnvironmentNames.serverName,
  );

  if (!ca && !certificate && !key && !serverName) {
    return {};
  }

  if (!ca || !certificate || !key || !serverName) {
    throw tlsConfigurationError(
      `${tlsEnvironmentNames.ca}, ${tlsEnvironmentNames.certificate}, ${tlsEnvironmentNames.key}, and ${tlsEnvironmentNames.serverName} must be configured together`,
    );
  }

  rejectSslUrlParameters(connectionString);

  const validatedCertificate = validateCertificatePem(
    decodeBase64Pem(certificate, tlsEnvironmentNames.certificate),
    tlsEnvironmentNames.certificate,
  );
  const validatedKey = validatePrivateKeyPem(
    decodeBase64Pem(key, tlsEnvironmentNames.key),
  );
  validateClientCertificateKeyPair(validatedCertificate, validatedKey);

  return {
    // PgBouncer speaks the normal PostgreSQL SSLRequest protocol. Set this
    // explicitly so an ambient PGSSLNEGOTIATION value cannot alter the route.
    sslnegotiation: "postgres",
    ssl: {
      ca: validateCertificatePem(
        decodeBase64Pem(ca, tlsEnvironmentNames.ca),
        tlsEnvironmentNames.ca,
      ),
      cert: validatedCertificate,
      key: validatedKey,
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      servername: validateServerName(serverName),
    },
  };
}

export { tlsEnvironmentNames };
