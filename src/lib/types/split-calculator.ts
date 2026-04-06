export interface NostrProfileInfo {
  name?: string;
  displayName?: string;
  picture?: string;
  lud16?: string;
  nip05?: string;
}

export interface Member {
  id: string;
  name: string;
  npub?: string;
  nostrProfile?: NostrProfileInfo;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  currency: Currency;
  isCancelled?: boolean;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
}

export type Currency = "jpy" | "usd";

export interface BtcPrice {
  jpy: number;
  usd: number;
}
