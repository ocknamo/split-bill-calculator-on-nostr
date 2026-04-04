import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXPENSE_KIND, LOCK_KIND, MEMBER_KIND, SETTLEMENT_KIND } from "./events/types";
import {
  createRelayClient,
  fetchSettlementEvents,
  type RelayConfig,
  type SubscriptionOptions,
} from "./relay-rx";

// Mock rx-nostr
const mockSubscription = { unsubscribe: vi.fn() };
const mockRxReq = {
  emit: vi.fn(),
  over: vi.fn(),
};
const mockForwardRxReq = {
  emit: vi.fn(),
};
const mockRxNostr = {
  use: vi.fn(),
  send: vi.fn(),
};

vi.mock("$lib/nostr/rx-nostr-client", () => ({
  getRxNostr: vi.fn(() => mockRxNostr),
}));

vi.mock("rx-nostr", async () => {
  const actual = await vi.importActual<typeof import("rx-nostr")>("rx-nostr");
  return {
    ...actual,
    createRxBackwardReq: vi.fn(() => mockRxReq),
    createRxForwardReq: vi.fn(() => mockForwardRxReq),
  };
});

// Helper: build a chainable observable mock
function makeObservable(packets: unknown[], eose = true) {
  return {
    pipe: vi.fn().mockReturnThis(),
    subscribe: vi.fn((observer: { next: (p: unknown) => void; complete: () => void }) => {
      for (const p of packets) observer.next(p);
      if (eose) observer.complete();
      return mockSubscription;
    }),
  };
}

describe("createRelayClient", () => {
  const config: RelayConfig = { relays: ["wss://relay.example.com"], timeout: 5000 };

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("should expose subscribe, subscribeForward, publish, close", () => {
    const client = createRelayClient(config);
    expect(client.subscribe).toBeDefined();
    expect(client.subscribeForward).toBeDefined();
    expect(client.publish).toBeDefined();
    expect(client.close).toBeDefined();
  });

  describe("subscribe", () => {
    it("should emit filter with all kinds by default", () => {
      const obs = makeObservable([]);
      mockRxNostr.use.mockReturnValue(obs);

      const options: SubscriptionOptions = {
        settlementId: "sid",
        onEvent: vi.fn(),
      };
      createRelayClient(config).subscribe(options);

      expect(mockRxReq.emit).toHaveBeenCalledWith({
        kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
        "#d": ["sid"],
      });
    });

    it("should use provided kinds when specified", () => {
      const obs = makeObservable([]);
      mockRxNostr.use.mockReturnValue(obs);

      createRelayClient(config).subscribe({
        settlementId: "sid",
        kinds: [EXPENSE_KIND],
        onEvent: vi.fn(),
      });

      expect(mockRxReq.emit).toHaveBeenCalledWith({
        kinds: [EXPENSE_KIND],
        "#d": ["sid"],
      });
    });

    it("should call onEvent for each received packet", () => {
      const mockEvent = { id: "e1", kind: EXPENSE_KIND };
      const obs = makeObservable([{ event: mockEvent }]);
      mockRxNostr.use.mockReturnValue(obs);

      const onEvent = vi.fn();
      createRelayClient(config).subscribe({ settlementId: "sid", onEvent });

      expect(onEvent).toHaveBeenCalledWith(mockEvent);
    });

    it("should call onEose on complete", () => {
      const obs = makeObservable([]);
      mockRxNostr.use.mockReturnValue(obs);

      const onEose = vi.fn();
      createRelayClient(config).subscribe({ settlementId: "sid", onEvent: vi.fn(), onEose });

      expect(onEose).toHaveBeenCalled();
    });

    it("should return close handle that unsubscribes", () => {
      const obs = makeObservable([], false);
      mockRxNostr.use.mockReturnValue(obs);

      const sub = createRelayClient(config).subscribe({
        settlementId: "sid",
        onEvent: vi.fn(),
      });
      sub.close();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(mockRxReq.over).toHaveBeenCalled();
    });
  });

  describe("subscribeForward", () => {
    it("should emit filter with all kinds by default", () => {
      const obs = makeObservable([], false);
      mockRxNostr.use.mockReturnValue(obs);

      const options: SubscriptionOptions = {
        settlementId: "sid",
        onEvent: vi.fn(),
      };
      createRelayClient(config).subscribeForward(options);

      expect(mockForwardRxReq.emit).toHaveBeenCalledWith({
        kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
        "#d": ["sid"],
      });
    });

    it("should call onEvent for each received packet", () => {
      const mockEvent = { id: "e1", kind: EXPENSE_KIND };
      const obs = makeObservable([{ event: mockEvent }], false);
      mockRxNostr.use.mockReturnValue(obs);

      const onEvent = vi.fn();
      createRelayClient(config).subscribeForward({ settlementId: "sid", onEvent });

      expect(onEvent).toHaveBeenCalledWith(mockEvent);
    });

    it("should return close handle that unsubscribes without calling over", () => {
      const obs = makeObservable([], false);
      mockRxNostr.use.mockReturnValue(obs);

      const sub = createRelayClient(config).subscribeForward({
        settlementId: "sid",
        onEvent: vi.fn(),
      });
      sub.close();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("publish", () => {
    it("should resolve when at least one relay succeeds", async () => {
      const sendObs = {
        subscribe: vi.fn((observer: { next: (p: unknown) => void; complete: () => void }) => {
          observer.next({ ok: true, from: "wss://relay.example.com" });
          observer.complete();
          return mockSubscription;
        }),
      };
      mockRxNostr.send.mockReturnValue(sendObs);

      const event = {
        id: "eid",
        kind: EXPENSE_KIND,
        pubkey: "pk",
        tags: [],
        content: "",
        sig: "s",
        created_at: 0,
      };
      await expect(createRelayClient(config).publish(event)).resolves.toBeUndefined();
    });

    it("should reject when all relays fail", async () => {
      const sendObs = {
        subscribe: vi.fn((observer: { next: (p: unknown) => void; complete: () => void }) => {
          observer.next({ ok: false, from: "wss://relay.example.com", notice: "blocked" });
          observer.complete();
          return mockSubscription;
        }),
      };
      mockRxNostr.send.mockReturnValue(sendObs);

      const event = {
        id: "eid",
        kind: EXPENSE_KIND,
        pubkey: "pk",
        tags: [],
        content: "",
        sig: "s",
        created_at: 0,
      };
      await expect(createRelayClient(config).publish(event)).rejects.toThrow();
    });
  });
});

describe("fetchSettlementEvents", () => {
  const config: RelayConfig = { relays: ["wss://relay.example.com"], timeout: 5000 };

  beforeEach(() => vi.clearAllMocks());

  it("should return all events received before EOSE", async () => {
    const events = [
      { id: "e1", kind: SETTLEMENT_KIND },
      { id: "e2", kind: MEMBER_KIND },
    ];
    const obs = makeObservable(events.map((event) => ({ event })));
    mockRxNostr.use.mockReturnValue(obs);

    const result = await fetchSettlementEvents(config, "sid");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("e1");
    expect(result[1].id).toBe("e2");
    expect(mockRxReq.over).toHaveBeenCalled();
  });

  it("should emit filter then call over()", async () => {
    const obs = makeObservable([]);
    mockRxNostr.use.mockReturnValue(obs);

    await fetchSettlementEvents(config, "my-settlement");

    expect(mockRxReq.emit).toHaveBeenCalledWith({
      kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
      "#d": ["my-settlement"],
    });
    expect(mockRxReq.over).toHaveBeenCalled();
  });
});
