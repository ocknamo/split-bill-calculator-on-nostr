# SvelteKit マイグレーション状況

## ブランチ
`claude/migrate-vite-plus-TtcEr`

---

## ✅ 完了

### ビジネスロジック層 (packages/app/src/lib/)
- `types/split-calculator.ts` — Member, Expense, Settlement, Currency, BtcPrice
- `types/nostr.ts` — NostrProfile, LnurlPayInfo
- `constants.ts` — DEFAULT_RELAYS, COINGECKO_API_URL, etc.
- `utils.ts` — cn() (clsx + tailwind-merge)
- `utils/currency.ts` — formatCurrency, fiatToSats, formatBtcPrice
- `settlements.ts` — calculateSettlements (greedy algorithm)
- `nostr/lightning.ts` — fetchLnurlPayInfo, fetchLightningInvoice
- `nostr/rx-nostr-client.ts` — getRxNostr() singleton
- `nostr/profile-rx.ts` — fetchNostrProfile, isValidNpub, npubToHex
- `nostr/settlement/capability.ts` — generateInviteToken, calculateCap (NUL separator fix)
- `nostr/settlement/id.ts` — generateSettlementId
- `nostr/settlement/events.ts` — createSettlementEvent, createMemberEvent, etc.
- `nostr/settlement/state.ts` — buildSettlementState
- `nostr/settlement/storage.ts` — loadOwnerKey, saveOwnerKey, cleanupOldOwnerKeys
- `nostr/settlement/relay-rx.ts` — createRelayClient, fetchSettlementEvents (TDZ fix)
- `nostr/settlement/settlement-sync.svelte.ts` — SettlementSync class (Svelte 5 $state)
- `stores/btc-price.svelte.ts` — BtcPriceStore (rate-limit handling)

**テスト: 105件 グリーン**

### UIコンポーネント (packages/app/src/)
- `lib/components/MemberAvatar.svelte`
- `lib/components/MemberList.svelte` (名前/Nostr npub 2モード)
- `lib/components/ExpenseForm.svelte`
- `lib/components/ExpenseList.svelte`
- `lib/components/SettlementList.svelte` (Lightning決済ボタン付き)
- `lib/components/SettlementHeader.svelte` (接続ステータス、招待リンク)
- `lib/components/CurrencySwitcher.svelte`
- `lib/components/PriceFooter.svelte`
- `lib/components/SyncModeSelector.svelte`
- `lib/components/CreateSettlementDialog.svelte`
- `lib/components/LockSettlementDialog.svelte`
- `lib/components/LightningPaymentModal.svelte` (qrcode、LNURL)
- `lib/components/SplitCalculator.svelte` (スタンドアロン、sessionStorage永続化)
- `lib/components/SplitCalculatorSync.svelte` (SettlementSync統合)
- `routes/+page.svelte` (モード切替、URLパース)
- `routes/+layout.svelte` (OGPメタデータ)

**svelte-check: 0 errors**

### CI / 設定
- `.github/workflows/packages-app-ci.yml` — test + check (build はコメントアウト中)
- `biome.json` — `packages/app` をbiome対象外に
- `svelte.config.js` — `kit.alias.vitest` → vite-plus/test
- `vite.config.ts` — vite-plus, happy-dom, $lib alias

---

## ❌ 残りTODO

| # | タスク | 優先度 | 備考 |
|---|---|---|---|
| 1 | `pnpm run build` 成功確認 | **高** | adapter-static でビルドが通るか |
| 2 | `packages-app-ci.yml` の `build` ステップ有効化 | **高** | build 成功後にコメントアウト解除 |
| 3 | `deploy.yml` を SvelteKit 向けに更新 | 中 | 現在は `next build` を実行している |
| 4 | 旧コード削除 | 低 | `app/`, `components/`, `hooks/`, `lib/` (ルート直下) |

