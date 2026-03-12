import { describe, it, expect } from "vitest";
import { analyzeHeartbeat } from "../analyzer";
import type { AgentMap } from "../types";

const baseMap = (): AgentMap => ({
  hasConfig: false,
  agents: [],
  skills: [],
  skillCount: 0,
  workspace: { coreFiles: [], customFiles: [], memoryFiles: [], subagentProtocols: [], missingRecommended: [], projectDirs: [] },
});

describe("analyzeHeartbeat", () => {
  it("sets heartbeat enabled to true", () => {
    const result = analyzeHeartbeat("model: gpt-4\ninterval: 1 hour", baseMap());
    expect(result.config?.heartbeat.enabled).toBe(true);
  });

  it("extracts model with colon syntax", () => {
    const result = analyzeHeartbeat("model: claude-3", baseMap());
    expect(result.config?.heartbeat.model).toBe("claude-3");
  });

  it("extracts model with equals syntax", () => {
    const result = analyzeHeartbeat("model = gpt-4o", baseMap());
    expect(result.config?.heartbeat.model).toBe("gpt-4o");
  });

  it("extracts interval", () => {
    const result = analyzeHeartbeat("interval: 30 minutes", baseMap());
    expect(result.config?.heartbeat.interval).toBe("30 minutes");
  });

  it("handles missing model gracefully", () => {
    const result = analyzeHeartbeat("interval: 1 hour", baseMap());
    expect(result.config?.heartbeat.model).toBeUndefined();
    expect(result.config?.heartbeat.enabled).toBe(true);
  });

  it("handles missing interval gracefully", () => {
    const result = analyzeHeartbeat("model: gpt-4", baseMap());
    expect(result.config?.heartbeat.interval).toBeUndefined();
  });

  it("initialises config if map has none", () => {
    const map = baseMap(); // no config
    const result = analyzeHeartbeat("model: gpt-4", map);
    expect(result.config).toBeDefined();
    expect(result.config?.models).toEqual([]);
    expect(result.config?.agents).toEqual([]);
    expect(result.config?.channels).toEqual([]);
  });

  it("preserves existing config fields", () => {
    const map: AgentMap = {
      ...baseMap(),
      config: {
        models: [{ id: "gpt-4", provider: "openai" }],
        agents: [{ id: "writer", model: "gpt-4" }],
        heartbeat: { enabled: false },
        channels: ["slack"],
      },
    };
    const result = analyzeHeartbeat("model: claude-3\ninterval: 1 hour", map);
    expect(result.config?.models).toEqual([{ id: "gpt-4", provider: "openai" }]);
    expect(result.config?.channels).toEqual(["slack"]);
  });

  it("handles empty content without throwing", () => {
    expect(() => analyzeHeartbeat("", baseMap())).not.toThrow();
  });
});