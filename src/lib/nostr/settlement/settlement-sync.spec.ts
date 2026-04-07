import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateInviteLink, parseInviteLink, SettlementSync } from "./settlement-sync.svelte";

// Mock relay-rx
const mockForwardSubClose = vi.fn();
const mockRelayClient = {
  subscribe: vi.fn(() => ({ close: vi.fn() })),
  subscribeForward: vi.fn(() => ({ close: mockForwardSubClose })),
  publish: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
};

vi.mock("$lib/nostr/settlement/relay-rx", () => ({
  createRelayClient: vi.fn(() => mockRelayClient),
  fetchSettlementEvents: vi.fn(() => Promise.resolve([])),
}));

// Mock @rx-nostr/crypto
vi.mock("@rx-nostr/crypto", () => ({
  generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)),
  getPublicKey: vi.fn(() => "mock-pubkey"),
  finalizeEvent: vi.fn((template: Record<string, unknown>) => ({
    ...template,
    id: "mock-event-id",
    pubkey: "mock-pubkey",
    sig: "mock-sig",
  })),
}));

// Mock storage
vi.mock("$lib/nostr/settlement/storage", () => ({
  loadOwnerKey: vi.fn(() => null),
  saveOwnerKey: vi.fn(),
}));

describe("parseInviteLink", () => {
  it("should parse valid invite link", () => {
    const result = parseInviteLink("https://example.com/join?s=settlement-123&t=token-abc");
    expect(result).toEqual({ settlementId: "settlement-123", inviteToken: "token-abc" });
  });

  it("should return null for invalid URL", () => {
    expect(parseInviteLink("not-a-url")).toBeNull();
  });

  it("should return null if settlement_id is missing", () => {
    expect(parseInviteLink("https://example.com/join?t=token-abc")).toBeNull();
  });

  it("should return null if invite_token is missing", () => {
    expect(parseInviteLink("https://example.com/join?s=settlement-123")).toBeNull();
  });

  it("should handle URL with additional parameters", () => {
    const result = parseInviteLink(
      "https://example.com/join?s=settlement-123&t=token-abc&extra=value",
    );
    expect(result).toEqual({ settlementId: "settlement-123", inviteToken: "token-abc" });
  });
});

describe("generateInviteLink", () => {
  it("should generate invite link with s and t params", () => {
    const result = generateInviteLink("settlement-123", "token-abc", "https://example.com/join");
    expect(result).toBe("https://example.com/join?s=settlement-123&t=token-abc");
  });

  it("should URL encode special characters", () => {
    const result = generateInviteLink("settlement/123", "token+abc", "https://example.com/join");
    expect(result).toContain("settlement%2F123");
    expect(result).toContain("token%2Babc");
  });
});

describe("SettlementSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });

    expect(sync.isLoading).toBe(true);
    expect(sync.state).toBeNull();
    expect(sync.error).toBeNull();
    expect(sync.connectionStatus).toBe("connecting");
  });

  it("should expose addExpense method", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(typeof sync.addExpense).toBe("function");
  });

  it("should expose addMember method", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(typeof sync.addMember).toBe("function");
  });

  it("should expose lockSettlement method", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(typeof sync.lockSettlement).toBe("function");
  });

  it("should expose removeMember method", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(typeof sync.removeMember).toBe("function");
  });

  it("should expose removeExpense method", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(typeof sync.removeExpense).toBe("function");
  });

  it("should expose canRemoveExpense method", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(typeof sync.canRemoveExpense).toBe("function");
  });

  it("canRemoveExpense should return false when state is null", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    // state is null before init
    expect(sync.canRemoveExpense("nonexistent-id")).toBe(false);
  });

  it("canRemoveExpense should return false for non-existent expense", async () => {
    const { fetchSettlementEvents } = await import("$lib/nostr/settlement/relay-rx");
    vi.mocked(fetchSettlementEvents).mockResolvedValueOnce([]);

    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    await sync.init();
    expect(sync.canRemoveExpense("nonexistent-id")).toBe(false);
  });

  it("removeMember should throw if not owner", async () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    // loadOwnerKey returns null (mocked), so isOwner is false
    await expect(sync.removeMember("some-member-id")).rejects.toThrow("Owner権限がありません");
  });

  it("removeExpense should throw if not initialized (no client)", async () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    // Not initialized, so #client is null
    await expect(sync.removeExpense("some-expense-id")).rejects.toThrow("Not initialized");
  });

  it("removeExpense should throw if expense not found in state", async () => {
    const { fetchSettlementEvents } = await import("$lib/nostr/settlement/relay-rx");
    vi.mocked(fetchSettlementEvents).mockResolvedValueOnce([]);

    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    await sync.init();
    // state is null (no events), so expense won't be found
    await expect(sync.removeExpense("nonexistent-expense-id")).rejects.toThrow(
      "支出が見つかりません",
    );
  });

  it("should expose refresh method", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(typeof sync.refresh).toBe("function");
  });

  it("should not throw when destroy is called", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(() => sync.destroy()).not.toThrow();
  });

  it("should report isOwner false when no owner key stored", () => {
    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });
    expect(sync.isOwner).toBe(false);
  });

  it("should load owner key from storage on construction", async () => {
    const { loadOwnerKey } = await import("$lib/nostr/settlement/storage");
    new SettlementSync({ settlementId: "sid", inviteToken: "tok" });
    expect(loadOwnerKey).toHaveBeenCalledWith("sid");
  });

  it("should transition to connected after successful init", async () => {
    const { fetchSettlementEvents } = await import("$lib/nostr/settlement/relay-rx");
    vi.mocked(fetchSettlementEvents).mockResolvedValueOnce([]);

    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });

    await sync.init();

    expect(sync.isLoading).toBe(false);
    expect(sync.connectionStatus).toBe("connected");
  });

  it("should start forward subscription after successful init", async () => {
    const { fetchSettlementEvents } = await import("$lib/nostr/settlement/relay-rx");
    vi.mocked(fetchSettlementEvents).mockResolvedValueOnce([]);

    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });

    await sync.init();

    expect(mockRelayClient.subscribeForward).toHaveBeenCalledWith(
      expect.objectContaining({ settlementId: "settlement-123" }),
    );
  });

  it("should close forward subscription on destroy after init", async () => {
    const { fetchSettlementEvents } = await import("$lib/nostr/settlement/relay-rx");
    vi.mocked(fetchSettlementEvents).mockResolvedValueOnce([]);

    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });

    await sync.init();
    mockForwardSubClose.mockClear();
    sync.destroy();

    expect(mockForwardSubClose).toHaveBeenCalled();
  });

  it("should set error and disconnected status on init failure", async () => {
    const { fetchSettlementEvents } = await import("$lib/nostr/settlement/relay-rx");
    vi.mocked(fetchSettlementEvents).mockRejectedValueOnce(new Error("Network error"));

    const sync = new SettlementSync({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    });

    await sync.init();

    expect(sync.isLoading).toBe(false);
    expect(sync.connectionStatus).toBe("error");
    expect(sync.error).toContain("Network error");
  });
});
