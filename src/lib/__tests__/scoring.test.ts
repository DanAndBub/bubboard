import { describe, it, expect } from "vitest";
import { calculateHealthScore } from "../scoring";
import type { AgentMap } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMap = (overrides: Partial<AgentMap> = {}): AgentMap => ({
  hasConfig: false,
  agents: [],
  skills: [],
  skillCount: 0,
  workspace: {
    coreFiles: [],
    customFiles: [],
    memoryFiles: [],
    subagentProtocols: [],
    missingRecommended: [],
    projectDirs: [],
  },
  ...overrides,
});

const withCoreFiles = (...files: string[]) =>
  makeMap({
    workspace: {
      coreFiles: files,
      customFiles: [],
      memoryFiles: [],
      subagentProtocols: [],
      missingRecommended: [],
      projectDirs: [],
    },
  });

// ---------------------------------------------------------------------------
// calculateHealthScore
// ---------------------------------------------------------------------------

describe("calculateHealthScore", () => {
  it("returns maxScore of 10", () => {
    const { maxScore } = calculateHealthScore(makeMap());
    expect(maxScore).toBe(10);
  });

  it("scores 0 for a completely empty workspace", () => {
    const { score } = calculateHealthScore(makeMap());
    expect(score).toBe(0);
  });

  it("scores 10 for a fully populated workspace", () => {
    const map = makeMap({
      hasConfig: true,
      agents: [
        { id: "agentA", name: "Agent A" },
        { id: "agentB", name: "Agent B" },
      ],
      workspace: {
        coreFiles: ["SOUL.md", "AGENTS.md", "MEMORY.md", "TOOLS.md", "HEARTBEAT.md", "USER.md", "IDENTITY.md"],
        customFiles: [],
        memoryFiles: ["2025-01-01.md"],
        subagentProtocols: ["planner.md"],
        missingRecommended: [],
        projectDirs: [],
      },
    });
    const { score } = calculateHealthScore(map);
    expect(score).toBe(10);
  });

  it("marks SOUL.md as missing when not present", () => {
    const { items } = calculateHealthScore(makeMap());
    const soul = items.find(i => i.id === "soul");
    expect(soul?.status).toBe("missing");
  });

  it("marks SOUL.md as ok when present", () => {
    const { items } = calculateHealthScore(withCoreFiles("SOUL.md"));
    const soul = items.find(i => i.id === "soul");
    expect(soul?.status).toBe("ok");
  });

  it("is case-insensitive for file detection", () => {
    const { items } = calculateHealthScore(withCoreFiles("soul.md"));
    const soul = items.find(i => i.id === "soul");
    expect(soul?.status).toBe("ok");
  });

  it("marks openclaw.json as missing when hasConfig is false", () => {
    const { items } = calculateHealthScore(makeMap({ hasConfig: false }));
    const config = items.find(i => i.id === "config");
    expect(config?.status).toBe("missing");
  });

  it("marks openclaw.json as ok when hasConfig is true", () => {
    const { items } = calculateHealthScore(makeMap({ hasConfig: true }));
    const config = items.find(i => i.id === "config");
    expect(config?.status).toBe("ok");
  });

  it("marks memory_entries as warning when no memory files", () => {
    const { items } = calculateHealthScore(makeMap());
    const mem = items.find(i => i.id === "memory_entries");
    expect(mem?.status).toBe("warning");
  });

  it("marks memory_entries as ok when at least one memory file exists", () => {
    const map = makeMap({
      workspace: { coreFiles: [], customFiles: [], memoryFiles: ["2025-01-01.md"], subagentProtocols: [], missingRecommended: [], projectDirs: [] },
    });
    const { items } = calculateHealthScore(map);
    const mem = items.find(i => i.id === "memory_entries");
    expect(mem?.status).toBe("ok");
  });

  it("marks subagent protocols as warning when missing", () => {
    const { items } = calculateHealthScore(makeMap());
    const protocols = items.find(i => i.id === "protocols");
    expect(protocols?.status).toBe("warning");
  });

  it("marks subagent protocols as ok when protocol files exist", () => {
    const map = makeMap({
      workspace: { coreFiles: [], customFiles: [], memoryFiles: [], subagentProtocols: ["planner.md"], missingRecommended: [], projectDirs: [] },
    });
    const { items } = calculateHealthScore(map);
    const protocols = items.find(i => i.id === "protocols");
    expect(protocols?.status).toBe("ok");
  });

  it("score matches number of ok items", () => {
    const map = withCoreFiles("SOUL.md", "AGENTS.md");
    const { score, items } = calculateHealthScore(map);
    const okCount = items.filter(i => i.status === "ok").length;
    expect(score).toBe(okCount);
  });

  it("every item has a recommendation string", () => {
    const { items } = calculateHealthScore(makeMap());
    items.forEach(item => {
      expect(item.recommendation).toBeDefined();
      expect(item.recommendation?.length).toBeGreaterThan(0);
    });
  });
});