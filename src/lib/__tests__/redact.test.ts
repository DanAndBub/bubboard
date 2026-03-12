import { describe, it, expect } from "vitest";
import { redactSensitiveValues } from "../redact";

describe("redactSensitiveValues", () => {
  it("redacts 'key' fields", () => {
    const input = JSON.stringify({ key: "abc123" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.key).toBe("[REDACTED]");
  });

  it("redacts 'token' fields", () => {
    const input = JSON.stringify({ token: "ghp_xyz" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.token).toBe("[REDACTED]");
  });

  it("redacts 'secret' fields", () => {
    const input = JSON.stringify({ secret: "whsec_abc" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.secret).toBe("[REDACTED]");
  });

  it("redacts 'password' fields", () => {
    const input = JSON.stringify({ password: "hunter2" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.password).toBe("[REDACTED]");
  });

  it("redacts 'api_key' fields", () => {
    const input = JSON.stringify({ api_key: "sk-abc123" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.api_key).toBe("[REDACTED]");
  });

  it("redacts 'apiKey' camelCase fields", () => {
    const input = JSON.stringify({ apiKey: "sk-abc123" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.apiKey).toBe("[REDACTED]");
  });

  it("is case-insensitive for sensitive key names", () => {
    const input = JSON.stringify({ API_KEY: "sk-abc123", TOKEN: "tok_xyz" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.API_KEY).toBe("[REDACTED]");
    expect(result.TOKEN).toBe("[REDACTED]");
  });

  it("does NOT redact compound keys like OPENAI_API_KEY (exact match only)", () => {
    const input = JSON.stringify({ OPENAI_API_KEY: "sk-abc123" });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.OPENAI_API_KEY).not.toBe("[REDACTED]");
  });

  it("preserves non-sensitive fields", () => {
    const input = JSON.stringify({ model: "gpt-4", temperature: 0.7 });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.model).toBe("gpt-4");
    expect(result.temperature).toBe(0.7);
  });

  it("handles nested objects", () => {
    const input = JSON.stringify({ providers: { openai: { api_key: "sk-secret" } } });
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result.providers.openai.api_key).toBe("[REDACTED]");
  });

  it("handles arrays", () => {
    const input = JSON.stringify([{ key: "secret1" }, { key: "secret2" }]);
    const result = JSON.parse(redactSensitiveValues(input));
    expect(result[0].key).toBe("[REDACTED]");
    expect(result[1].key).toBe("[REDACTED]");
  });

  it("returns original string on invalid JSON", () => {
    const bad = "not json at all {{";
    expect(redactSensitiveValues(bad)).toBe(bad);
  });

  it("handles empty object", () => {
    expect(() => redactSensitiveValues("{}")).not.toThrow();
    expect(redactSensitiveValues("{}")).toBe("{}");
  });
});