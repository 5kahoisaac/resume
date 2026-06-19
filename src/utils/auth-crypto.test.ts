import { describe, it, expect } from "vitest";
import { getSecret, makeToken, verifyToken } from "~/utils/auth-crypto";

// ============================================================================
// getSecret — fail-closed resolution of AUTH_SECRET
// ============================================================================
describe("getSecret", () => {
  it("returns null when AUTH_SECRET is unset", () => {
    // Arrange
    const env = { get: () => undefined };

    // Act
    const result = getSecret(env);

    // Assert
    expect(result).toBeNull();
  });

  it("returns null when AUTH_SECRET is whitespace only", () => {
    // Arrange
    const env = { get: () => "   " };

    // Act
    const result = getSecret(env);

    // Assert
    expect(result).toBeNull();
  });

  it("returns the secret when AUTH_SECRET is set", () => {
    // Arrange
    const env = { get: () => "abc" };

    // Act
    const result = getSecret(env);

    // Assert
    expect(result).toBe("abc");
  });
});

// ============================================================================
// makeToken / verifyToken — HMAC-signed session token round trip
// ============================================================================
describe("makeToken / verifyToken", () => {
  it("verifies a token signed with the same secret", async () => {
    // Arrange
    const token = await makeToken("s1");

    // Act
    const result = await verifyToken(token, "s1");

    // Assert
    expect(result).toBe(true);
  });

  it("rejects a token verified against a different secret", async () => {
    // Arrange
    const token = await makeToken("s1");

    // Act
    const result = await verifyToken(token, "s2");

    // Assert
    expect(result).toBe(false);
  });

  it("rejects an undefined token", async () => {
    // Act
    const result = await verifyToken(undefined, "s1");

    // Assert
    expect(result).toBe(false);
  });

  it("rejects a garbage token string", async () => {
    // Act
    const result = await verifyToken("garbage", "s1");

    // Assert
    expect(result).toBe(false);
  });

  it("rejects a well-formed token with an incorrect signature", async () => {
    // Act
    const result = await verifyToken("ok.deadbeef", "s1");

    // Assert
    expect(result).toBe(false);
  });
});
