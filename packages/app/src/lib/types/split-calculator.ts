export interface Member {
  id: string;
  name: string;
  npub?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  currency: Currency;
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
