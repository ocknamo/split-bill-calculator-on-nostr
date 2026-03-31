import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLightningInvoice, fetchLnurlPayInfo } from "./lightning";

describe("fetchLnurlPayInfo", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return LnurlPayInfo on success", async () => {
    const mockData = { callback: "https://example.com/cb", minSendable: 1000, maxSendable: 1e11 };
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchLnurlPayInfo("alice@example.com");

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith("https://example.com/.well-known/lnurlp/alice");
  });

  it("should return null for invalid lud16 format", async () => {
    expect(await fetchLnurlPayInfo("not-an-address")).toBeNull();
  });

  it("should return null when response has no callback", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ minSendable: 1000 }),
    } as Response);

    expect(await fetchLnurlPayInfo("alice@example.com")).toBeNull();
  });

  it("should return null on fetch error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));
    expect(await fetchLnurlPayInfo("alice@example.com")).toBeNull();
  });

  it("should use defaults for minSendable/maxSendable if absent", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ callback: "https://cb.example.com" }),
    } as Response);

    const result = await fetchLnurlPayInfo("alice@example.com");
    expect(result?.minSendable).toBe(1000);
    expect(result?.maxSendable).toBe(100000000000);
  });
});

describe("fetchLightningInvoice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return bolt11 invoice on success", async () => {
    const pr = "lnbc1234...";
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ pr }),
    } as Response);

    const result = await fetchLightningInvoice("https://cb.example.com", 100000);

    expect(result).toBe(pr);
    expect(fetch).toHaveBeenCalledWith("https://cb.example.com?amount=100000");
  });

  it("should return null when no pr in response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({}),
    } as Response);

    expect(await fetchLightningInvoice("https://cb.example.com", 100000)).toBeNull();
  });

  it("should return null on fetch error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));
    expect(await fetchLightningInvoice("https://cb.example.com", 100000)).toBeNull();
  });
});
