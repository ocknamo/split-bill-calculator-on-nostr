/**
 * 精算履歴の永続化
 * LocalStorageを使用して過去の精算セッションを管理
 */

const HISTORY_STORAGE_KEY = "warikan-settlement-history";

export interface SettlementHistoryEntry {
  settlementId: string;
  inviteToken: string;
  name: string;
  createdAt: number; // ms
  lastAccessedAt: number; // ms
}

interface SettlementHistoryStore {
  [settlementId: string]: SettlementHistoryEntry;
}

export function saveSettlementHistory(entry: {
  settlementId: string;
  inviteToken: string;
  name: string;
}): void {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    const store: SettlementHistoryStore = stored ? JSON.parse(stored) : {};
    const existing = store[entry.settlementId];
    const now = Date.now();

    store[entry.settlementId] = {
      settlementId: entry.settlementId,
      inviteToken: entry.inviteToken,
      name: entry.name || existing?.name || "",
      createdAt: existing?.createdAt ?? now,
      lastAccessedAt: now,
    };

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function loadSettlementHistory(): SettlementHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const store: SettlementHistoryStore = JSON.parse(stored);
    return Object.values(store).sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
  } catch {
    return [];
  }
}

export function removeSettlementHistory(settlementId: string): void {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return;
    const store: SettlementHistoryStore = JSON.parse(stored);
    delete store[settlementId];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function cleanupOldSettlementHistory(): void {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return;
    const store: SettlementHistoryStore = JSON.parse(stored);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = false;
    for (const [id, entry] of Object.entries(store)) {
      if (now - entry.lastAccessedAt > thirtyDays) {
        delete store[id];
        cleaned = true;
      }
    }
    if (cleaned) localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}
