import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BtcPriceStore } from "./btc-price.svelte";

describe("BtcPriceStore", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function mockSuccess(jpy = 10000000, usd = 65000) {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ bitcoin: { jpy, usd } }),
    } as Response);
  }

  it("should have null price and false loading initially", () => {
    const store = new BtcPriceStore();
    expect(store.price).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("should update price on successful fetch", async () => {
    mockSuccess(10000000, 65000);
    const store = new BtcPriceStore();

    await store.fetch(true);

    expect(store.price).toEqual({ jpy: 10000000, usd: 65000 });
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("should set error on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const store = new BtcPriceStore();
    await store.fetch(true);

    expect(store.error).toContain("HTTP error: 500");
    expect(store.loading).toBe(false);
  });

  it("should handle 429 rate limit", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    } as Response);

    const store = new BtcPriceStore();
    await store.fetch(true);

    expect(store.rateLimited).toBe(true);
    expect(store.error).toContain("レート制限");
  });

  it("should not fetch again within MIN_FETCH_INTERVAL without force", async () => {
    mockSuccess();
    const store = new BtcPriceStore();

    await store.fetch(true);
    vi.mocked(fetch).mockClear();

    await store.fetch(); // not forced

    expect(fetch).not.toHaveBeenCalled();
  });

  it("should skip fetch while still rate limited", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    } as Response);

    const store = new BtcPriceStore();
    await store.fetch(true);
    vi.mocked(fetch).mockClear();

    // Try to fetch again while rate limited
    await store.fetch(true);

    expect(fetch).not.toHaveBeenCalled();
    expect(store.error).toContain("秒後に再試行");
  });

  it("should fetch again after rate limit expires", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    } as Response);

    const store = new BtcPriceStore();
    await store.fetch(true);

    // Advance past rate limit cooldown (60s)
    vi.advanceTimersByTime(61000);
    mockSuccess();

    await store.fetch(true);

    expect(store.price).toEqual({ jpy: 10000000, usd: 65000 });
    expect(store.rateLimited).toBe(false);
  });
});
