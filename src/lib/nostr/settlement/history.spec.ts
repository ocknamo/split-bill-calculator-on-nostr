import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupOldSettlementHistory,
  loadSettlementHistory,
  removeSettlementHistory,
  saveSettlementHistory,
} from "./history";

describe("saveSettlementHistory / loadSettlementHistory", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("should save and load a history entry", () => {
    saveSettlementHistory({ settlementId: "s1", inviteToken: "t1", name: "旅行費" });
    const entries = loadSettlementHistory();

    expect(entries).toHaveLength(1);
    expect(entries[0].settlementId).toBe("s1");
    expect(entries[0].inviteToken).toBe("t1");
    expect(entries[0].name).toBe("旅行費");
    expect(entries[0].createdAt).toBeGreaterThan(0);
    expect(entries[0].lastAccessedAt).toBeGreaterThanOrEqual(entries[0].createdAt);
  });

  it("should return empty array when no history exists", () => {
    expect(loadSettlementHistory()).toEqual([]);
  });

  it("should upsert: update name and lastAccessedAt but keep createdAt", () => {
    const now = Date.now();
    saveSettlementHistory({ settlementId: "s1", inviteToken: "t1", name: "旧名" });
    const first = loadSettlementHistory()[0];

    // Advance time
    vi.spyOn(Date, "now").mockReturnValue(now + 10000);
    saveSettlementHistory({ settlementId: "s1", inviteToken: "t1", name: "新名" });
    vi.restoreAllMocks();

    const updated = loadSettlementHistory()[0];
    expect(updated.name).toBe("新名");
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.lastAccessedAt).toBeGreaterThanOrEqual(first.lastAccessedAt);
  });

  it("should preserve existing name when upsert name is empty", () => {
    saveSettlementHistory({ settlementId: "s1", inviteToken: "t1", name: "旅行費" });
    saveSettlementHistory({ settlementId: "s1", inviteToken: "t1", name: "" });
    const entry = loadSettlementHistory()[0];
    expect(entry.name).toBe("旅行費");
  });

  it("should return entries sorted by lastAccessedAt descending", () => {
    const now = Date.now();

    vi.spyOn(Date, "now").mockReturnValue(now - 2000);
    saveSettlementHistory({ settlementId: "oldest", inviteToken: "t1", name: "A" });

    vi.spyOn(Date, "now").mockReturnValue(now);
    saveSettlementHistory({ settlementId: "newest", inviteToken: "t2", name: "B" });

    vi.spyOn(Date, "now").mockReturnValue(now - 1000);
    saveSettlementHistory({ settlementId: "middle", inviteToken: "t3", name: "C" });

    vi.restoreAllMocks();

    const entries = loadSettlementHistory();
    expect(entries.map((e) => e.settlementId)).toEqual(["newest", "middle", "oldest"]);
  });
});

describe("removeSettlementHistory", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("should remove a specific entry", () => {
    saveSettlementHistory({ settlementId: "s1", inviteToken: "t1", name: "A" });
    saveSettlementHistory({ settlementId: "s2", inviteToken: "t2", name: "B" });

    removeSettlementHistory("s1");

    const entries = loadSettlementHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0].settlementId).toBe("s2");
  });

  it("should not throw when removing non-existent entry", () => {
    expect(() => removeSettlementHistory("nonexistent")).not.toThrow();
  });
});

describe("cleanupOldSettlementHistory", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("should remove entries older than 30 days", () => {
    saveSettlementHistory({ settlementId: "old", inviteToken: "t1", name: "Old" });

    // Manually set lastAccessedAt to 31 days ago
    const stored = JSON.parse(localStorage.getItem("warikan-settlement-history")!);
    stored["old"].lastAccessedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem("warikan-settlement-history", JSON.stringify(stored));

    cleanupOldSettlementHistory();

    expect(loadSettlementHistory()).toHaveLength(0);
  });

  it("should keep entries newer than 30 days", () => {
    saveSettlementHistory({ settlementId: "new", inviteToken: "t1", name: "New" });

    cleanupOldSettlementHistory();

    expect(loadSettlementHistory()).toHaveLength(1);
  });
});
