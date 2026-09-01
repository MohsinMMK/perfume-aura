import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { rootCertificates } from "node:tls";
import {
  resolveRuntimeDatabaseTlsOptions,
  tlsEnvironmentNames,
} from "./database-tls";

const databaseUrl = "postgresql://runtime:password@db.perfumeaura.test:6432/perfume_aura";
const clientCertificate = `-----BEGIN CERTIFICATE-----
MIIBjjCCATSgAwIBAgIUTeB2Bv9Mdj+mCcd9JFQhI5/auUowCgYIKoZIzj0EAwIw
HjEcMBoGA1UEAwwTZGIucGVyZnVtZWF1cmEudGVzdDAeFw0yNjA5MDExODAwMTBa
Fw0yNjA5MDMxODAwMTBaMB4xHDAaBgNVBAMME2RiLnBlcmZ1bWVhdXJhLnRlc3Qw
WTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQgkbQ3vs3irSf0t9GIDvzmZ/An+lps
SYTb+So74XQOjpNIaLePU0jxzBRoU/mHvrs3C81+vZQgkS6Ztdvi2PTJo1AwTjAd
BgNVHQ4EFgQU6J+JJB1vucUQIOLQvl0bKrlDdGMwHwYDVR0jBBgwFoAU6J+JJB1v
ucUQIOLQvl0bKrlDdGMwDAYDVR0TAQH/BAIwADAKBggqhkjOPQQDAgNIADBFAiEA
zOpQGZPan45ZKzm2WR4S10cPylI+n+iysCs5uMzfEMECIADJfOGr0nRlGMeCbdfr
ifOXSi6r7lKhLgBSP82A+vry
-----END CERTIFICATE-----
`;
const clientPrivateKey = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIBMiYuJaoyhyI+B6LicMfpwP6IHV/jEPwG3T/hDJjFq+oAoGCCqGSM49
AwEHoUQDQgAEIJG0N77N4q0n9LfRiA785mfwJ/pabEmE2/kqO+F0Do6TSGi3j1NI
8cwUaFP5h767NwvNfr2UIJEumbXb4tj0yQ==
-----END EC PRIVATE KEY-----
`;

function encodePem(pem: string): string {
  return Buffer.from(pem, "utf8").toString("base64");
}

function validTlsEnvironment(): NodeJS.ProcessEnv {
  const certificate = rootCertificates[0];
  assert.ok(certificate, "Node.js must provide a root certificate for TLS unit tests");

  return {
    [tlsEnvironmentNames.ca]: encodePem(certificate),
    [tlsEnvironmentNames.certificate]: encodePem(clientCertificate),
    [tlsEnvironmentNames.key]: encodePem(clientPrivateKey),
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

  it("rejects a CA certificate or a client certificate with the wrong private key", () => {
    const caAsClientEnvironment = validTlsEnvironment();
    const rootCertificate = rootCertificates[0];
    assert.ok(rootCertificate);
    caAsClientEnvironment[tlsEnvironmentNames.certificate] = encodePem(rootCertificate);

    assert.throws(
      () => resolveRuntimeDatabaseTlsOptions(databaseUrl, caAsClientEnvironment),
      /must begin with an end-entity client certificate/,
    );

    const mismatchedKeyEnvironment = validTlsEnvironment();
    const { privateKey } = generateKeyPairSync("ed25519", {
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
    });
    mismatchedKeyEnvironment[tlsEnvironmentNames.key] = encodePem(privateKey);

    assert.throws(
      () => resolveRuntimeDatabaseTlsOptions(databaseUrl, mismatchedKeyEnvironment),
      /must form a matching key pair/,
    );
  });
});
