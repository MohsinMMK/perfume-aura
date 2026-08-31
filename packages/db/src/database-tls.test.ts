import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { rootCertificates } from "node:tls";
import {
  resolveRuntimeDatabaseTlsOptions,
  tlsEnvironmentNames,
} from "./database-tls";

const databaseUrl = "postgresql://runtime:password@db.perfumeaura.test:6432/perfume_aura";

function encodePem(pem: string): string {
  return Buffer.from(pem, "utf8").toString("base64");
}

function validTlsEnvironment(): NodeJS.ProcessEnv {
  const certificate = rootCertificates[0];
  assert.ok(certificate, "Node.js must provide a root certificate for TLS unit tests");

  const { privateKey } = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
  });

  return {
    [tlsEnvironmentNames.ca]: encodePem(certificate),
    [tlsEnvironmentNames.certificate]: encodePem(certificate),
    [tlsEnvironmentNames.key]: encodePem(privateKey),
    [tlsEnvironmentNames.serverName]: "db.perfumeaura.test",
  };
}

describe("resolveRuntimeDatabaseTlsOptions", () => {
  it("leaves existing local and Neon URL handling unchanged when TLS variables are absent", () => {
    const options = resolveRuntimeDatabaseTlsOptions(
      `${databaseUrl}?sslmode=require`,
      {},
    );

    assert.deepEqual(options, {});
  });

  it("creates certificate-verified mutual TLS options from valid base64 PEM values", () => {
    const environment = validTlsEnvironment();
    const options = resolveRuntimeDatabaseTlsOptions(databaseUrl, environment);
    const tlsOptions = options.ssl;

    assert.ok(tlsOptions && typeof tlsOptions !== "boolean");
    assert.equal(options.sslnegotiation, "postgres");
    assert.equal(tlsOptions.minVersion, "TLSv1.2");
    assert.equal(tlsOptions.rejectUnauthorized, true);
    assert.equal(tlsOptions.servername, "db.perfumeaura.test");
    assert.equal(typeof tlsOptions.ca, "string");
    assert.equal(typeof tlsOptions.cert, "string");
    assert.equal(typeof tlsOptions.key, "string");
  });

  it("requires every TLS value once any TLS value is configured", () => {
    assert.throws(
      () =>
        resolveRuntimeDatabaseTlsOptions(databaseUrl, {
          [tlsEnvironmentNames.ca]: "configured",
        }),
      /must be configured together/,
    );
  });

  it("rejects malformed base64 and PEM material without exposing its value", () => {
    const malformedBase64Environment = validTlsEnvironment();
    malformedBase64Environment[tlsEnvironmentNames.ca] = "not-base64!";

    assert.throws(
      () =>
        resolveRuntimeDatabaseTlsOptions(databaseUrl, malformedBase64Environment),
      /DATABASE_TLS_CA_PEM_BASE64 must be a canonical base64-encoded PEM value/,
    );

    const malformedPemEnvironment = validTlsEnvironment();
    malformedPemEnvironment[tlsEnvironmentNames.ca] = encodePem("not PEM text");

    assert.throws(
      () => resolveRuntimeDatabaseTlsOptions(databaseUrl, malformedPemEnvironment),
      /DATABASE_TLS_CA_PEM_BASE64 must contain PEM blocks only/,
    );
  });

  it("rejects URL SSL parameters that could override explicit TLS options", () => {
    assert.throws(
      () =>
        resolveRuntimeDatabaseTlsOptions(
          `${databaseUrl}?sslmode=disable`,
          validTlsEnvironment(),
        ),
      /must not include SSL query parameters/,
    );
  });

  it("rejects a TLS server name that cannot be verified as a DNS hostname", () => {
    const environment = validTlsEnvironment();
    environment[tlsEnvironmentNames.serverName] = "203.0.113.12";

    assert.throws(
      () => resolveRuntimeDatabaseTlsOptions(databaseUrl, environment),
      /must be a DNS hostname, not an IP address/,
    );
  });
});
