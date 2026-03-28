# SvelteKit 移行計画: ワリカンさん

## Context

現在の Next.js 実装は `output: 'export'` による完全静的サイトであり、SSR・API Routes・RSC など Next.js の付加価値が一切使われていない。
Vite+ (vp) + SvelteKit + adapter-static + bits-ui (shadcn-svelte) への移行により、
バンドルサイズの削減・リアクティビティの簡潔化・静的サイト出力の最適化を図る。

---

## 技術スタック（移行後）

| レイヤー | 技術 | 現状からの変化 |
|---------|------|-------------|
| ツールチェーン | **Vite+** (`vp` CLI) | Next.js → Vite ベース |
| フレームワーク | **SvelteKit 2** + Svelte 5 | React 19 → Svelte 5 (runes) |
| 静的出力 | **@sveltejs/adapter-static** | `output: 'export'` と同等 |
| スタイリング | **Tailwind CSS v4** | 変更なし |
| UIコンポーネント | **shadcn-svelte** (bits-ui ベース) | Radix UI → bits-ui |
| アイコン | **lucide-svelte** | lucide-react → |
| Toast | **svelte-sonner** | sonner → |
| QRコード | **@bitrequest/qr** または `qrcode` (framework-agnostic) | qrcode.react → |
| Nostr | **rx-nostr + @rx-nostr/crypto** | `nostr-tools` を除外。暗号操作も `@rx-nostr/crypto` に統一 |
| テスト | **Vitest** (vp test) + `*.spec.ts` コロケーション | 変更なし（ファイル構成方針を変更） |
| Lint/Format | **Oxlint + Oxfmt** (vp lint / vp fmt) | Biome → |

> **Vite+ について**: 現時点でアルファ版。`vp create svelte` で SvelteKit プロジェクトを scaffold し、
> Oxlint・Oxfmt・Vitest を統合した `vite.config.ts` 一本で管理する。

---

## 新規プロジェクトのディレクトリ構成

```
(新リポジトリ or 同リポジトリ内 packages/)
├── vite.config.ts                  # Vite+ 統合設定（lint/fmt/test 含む）
├── svelte.config.ts                # adapter-static 設定
├── src/
│   ├── app.css                     # Tailwind v4 import + CSS variables
│   ├── app.html                    # HTML shell (lang="ja")
│   ├── routes/
│   │   ├── +layout.svelte          # Root layout (フォント・Analytics)
│   │   └── +page.svelte            # エントリポイント・モード選択
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn-svelte コンポーネント
│   │   │   ├── split-calculator/   # feature コンポーネント (.svelte)
│   │   │   └── nostr/              # Nostr UI コンポーネント (.svelte)
│   │   ├── stores/                 # Svelte 5 runes ベースのストア
│   │   │   ├── calculator.svelte.ts
│   │   │   ├── settlement-sync.svelte.ts
│   │   │   ├── settlement-sync.spec.ts  # ← コロケーション spec
│   │   │   ├── btc-price.svelte.ts
│   │   │   ├── btc-price.spec.ts        # ← コロケーション spec
│   │   │   └── persistence.svelte.ts
│   │   ├── nostr/                  # ★ 現行コードをほぼそのまま移植（import パス修正）
│   │   │   ├── rx-nostr-client.ts
│   │   │   ├── lightning.ts
│   │   │   ├── lightning.spec.ts
│   │   │   └── settlement/
│   │   │       ├── capability.ts
│   │   │       ├── capability.spec.ts   # ← コロケーション spec
│   │   │       ├── events.ts            # import: nostr-tools → @rx-nostr/crypto
│   │   │       ├── events.spec.ts
│   │   │       ├── state.ts
│   │   │       ├── state.spec.ts
│   │   │       ├── relay-rx.ts
│   │   │       ├── relay-rx.spec.ts
│   │   │       ├── id.ts
│   │   │       ├── id.spec.ts
│   │   │       ├── storage.ts
│   │   │       ├── storage.spec.ts
│   │   │       └── events/         # 型定義、再利用
│   │   ├── utils.ts                # cn() 再利用
│   │   └── constants.ts            # 再利用
│   └── types/                      # ★ そのまま移植
│       ├── split-calculator.ts
│       └── nostr.ts
└── static/
    └── favicon.jpg
```

---

## 再利用 vs 書き直し

### そのまま移植（変更ほぼ不要）

| ファイル | 理由 |
|---------|------|
| `lib/nostr/settlement/capability.ts` | 純粋関数、Web Crypto のみ |
| `lib/nostr/settlement/state.ts` | 純粋 async 関数 |
| `lib/nostr/settlement/relay-rx.ts` | rx-nostr 依存のみ |
| `lib/nostr/settlement/id.ts` | `crypto.randomUUID()` のみ |
| `lib/nostr/settlement/storage.ts` | localStorage のみ |
| `lib/nostr/rx-nostr-client.ts` | シングルトン、フレームワーク非依存 |
| `lib/nostr/lightning.ts` | fetch のみ |
| `lib/constants.ts` | 定数のみ |
| `lib/utils.ts` | `cn()` |
| `types/*.ts` | 型定義のみ |

### インポート変更が必要（ロジック変更なし）

| ファイル | 変更内容 |
|---------|---------|
| `lib/nostr/settlement/events.ts` | `nostr-tools` → `@rx-nostr/crypto` に差し替え（後述） |
| `lib/nostr/settlement/hooks.ts` → `stores/settlement-sync.svelte.ts` | 同上 + React → Svelte 5 runes 変換 |

**`@rx-nostr/crypto` で代替する nostr-tools の関数:**

```typescript
// 現行 (nostr-tools)
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from 'nostr-tools'

// 移行後 (@rx-nostr/crypto + rx-nostr)
import { finalizeEvent, generateSecretKey, getPublicKey } from '@rx-nostr/crypto'
import type { NostrEvent } from 'rx-nostr'  // または自前の型定義を継続使用
```

`@rx-nostr/crypto` が提供する主要関数（`nostr-tools` の同名関数と互換 API）:
- `generateSecretKey()` → `Uint8Array`
- `getPublicKey(sk: Uint8Array)` → `string`（hex pubkey）
- `finalizeEvent(template, sk)` → 署名済みイベント
- `verifyEvent(event)` → `boolean`

> **注意**: `nostr-tools` は `package.json` の依存から削除する。`@rx-nostr/crypto` と `rx-nostr` のみを使用。

### 書き直し（React → Svelte 5 runes）

| 現行 | 移行後 | 変換パターン |
|-----|--------|------------|
| `hooks/use-settlements.ts` | 純粋関数 `calculateSettlements()` | `$derived` から呼ぶだけ |
| `hooks/use-btc-price.ts` | `stores/btc-price.svelte.ts` | `$state` + `$effect` |
| `hooks/use-currency.ts` | ユーティリティ関数 + `$derived` | フレームワーク非依存化 |
| `hooks/use-persisted-state.ts` | `stores/persistence.svelte.ts` | `$state` + `$effect` で sessionStorage 同期 |
| `lib/nostr/settlement/hooks.ts` (`useSettlementSync`) | `stores/settlement-sync.svelte.ts` | Svelte 5 クラス（最大の変換作業） |
| 全 React コンポーネント | `.svelte` ファイル | JSX → Svelte テンプレート構文 |

---

## 主要な変換パターン

### useState + useEffect → $state + $effect

```svelte
<!-- Svelte 5 runes -->
<script lang="ts">
  let isLoading = $state(false)
  let btcPrice = $state<BtcPrice | null>(null)

  $effect(() => {
    fetchPrice()
    return () => { /* cleanup */ }
  })
</script>
```

### useMemo → $derived

```svelte
<script lang="ts">
  // 現行: useMemo(() => calculateSettlements(members, expenses), [members, expenses])
  const settlements = $derived(calculateSettlements(members, expenses))
</script>
```

### useSettlementSync → SettlementSync クラス（最大の変換作業）

```typescript
// stores/settlement-sync.svelte.ts
import { browser } from '$app/environment'
import { finalizeEvent, generateSecretKey, getPublicKey } from '@rx-nostr/crypto'
import { buildSettlementState, type SettlementState } from '$lib/nostr/settlement/state'
import { createRelayClient, fetchSettlementEvents, type RelayClient } from '$lib/nostr/settlement/relay-rx'
import { loadOwnerKey } from '$lib/nostr/settlement/storage'
import type { NostrEvent } from 'rx-nostr'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export class SettlementSync {
  // リアクティブな公開状態
  state = $state<SettlementState | null>(null)
  isLoading = $state(true)
  error = $state<string | null>(null)
  connectionStatus = $state<ConnectionStatus>('connecting')

  // プライベート
  #events: NostrEvent[] = []
  #seenIds = new Set<string>()
  #client: RelayClient | null = null
  #actorSk: Uint8Array
  #actorPubkey: string
  #ownerKey: { sk: Uint8Array; pubkey: string } | null

  readonly settlementId: string
  readonly inviteToken: string

  get isOwner() {
    return this.#ownerKey !== null &&
      this.state?.ownerPubkey === this.#ownerKey.pubkey
  }

  get isLocked() {
    return this.state?.isLocked ?? false
  }

  constructor(settlementId: string, inviteToken: string, relays?: string[]) {
    this.settlementId = settlementId
    this.inviteToken = inviteToken
    this.#actorSk = generateSecretKey()
    this.#actorPubkey = getPublicKey(this.#actorSk)
    this.#ownerKey = loadOwnerKey(settlementId)

    if (browser) {
      this.#init(relays)
    }
  }

  async #init(relays?: string[]) {
    // fetchSettlementEvents → buildSettlementState → state 更新
    // 現行 useSettlementSync の useEffect(init) と同ロジック
  }

  async addExpense(memberPubkey: string, amount: number, currency: string, note: string) {
    // 現行 addExpense と同ロジック（nostr-tools → @rx-nostr/crypto）
  }

  async addMember(pubkey: string, name: string, picture?: string, lud16?: string) {
    // オーナー権限チェック後、現行 addMember と同ロジック
  }

  async lockSettlement(acceptedEventIds: string[]) {
    // オーナー権限チェック後、現行 lockSettlement と同ロジック
  }

  async refresh() {
    // 現行 refresh と同ロジック
  }

  destroy() {
    this.#client?.close()
  }
}
```

**+page.svelte での使用例:**

```svelte
<script lang="ts">
  import { page } from '$app/stores'
  import { onDestroy } from 'svelte'
  import { SettlementSync } from '$lib/stores/settlement-sync.svelte'

  const s = $page.url.searchParams.get('s')
  const t = $page.url.searchParams.get('t')

  let sync = new SettlementSync(s!, t!)
  onDestroy(() => sync.destroy())
</script>

{#if sync.isLoading}
  <Spinner />
{:else if sync.state}
  <SplitCalculatorSync {sync} />
{/if}
```

### usePersistedState → persistence.svelte.ts

```typescript
// stores/persistence.svelte.ts
const STORAGE_KEY = 'warikan-calculator-data'

function loadFromStorage<T>(key: string, fallback: T): T {
  if (!browser) return fallback
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed[key] ?? fallback
  } catch { return fallback }
}

export function persistedState<T>(key: string, initial: T) {
  let value = $state<T>(loadFromStorage(key, initial))

  $effect(() => {
    if (!browser) return
    const all = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
    all[key] = value
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  })

  return {
    get value() { return value },
    set value(v: T) { value = v },
  }
}
```

### URL パラメータ取得

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { page } from '$app/stores'

  // 起動時に URL を確認して自動で同期モードへ
  const settlementId = $page.url.searchParams.get('s')
  const inviteToken  = $page.url.searchParams.get('t')
</script>
```

### shadcn-svelte コンポーネント（bits-ui ベース）

```svelte
<!-- 現行: Radix UI Dialog -->
<!-- 移行後: shadcn-svelte の Dialog（bits-ui Dialog を内包） -->
<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>招待リンク</Dialog.Title>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
```

---

## 実装フェーズ

### Phase 1: プロジェクト初期化

```bash
vp create svelte          # または: pnpm create svelte@latest（フォールバック）
```

1. `svelte.config.ts` に `adapter-static` を設定:
   ```typescript
   import adapter from '@sveltejs/adapter-static'
   export default { kit: { adapter: adapter() } }
   ```
2. Tailwind CSS v4 + `app.css` の CSS 変数設定（現行の `globals.css` を移植）
3. shadcn-svelte を初期化:
   ```bash
   npx shadcn-svelte@latest init
   ```
4. 依存パッケージを追加:
   ```bash
   pnpm add bits-ui lucide-svelte svelte-sonner qrcode
   pnpm add rx-nostr @rx-nostr/crypto @noble/hashes
   pnpm add clsx tailwind-merge class-variance-authority
   ```
   ※ `nostr-tools` は追加しない
5. `vite.config.ts` に Vitest 設定を統合:
   ```typescript
   test: {
     environment: 'happy-dom',
     include: ['src/**/*.spec.ts'],
     setupFiles: ['src/vitest.setup.ts'],
   }
   ```

### Phase 2: ビジネスロジック移植

1. `lib/nostr/` 以下を `src/lib/nostr/` へコピー（パス調整のみ）
2. `types/` を `src/types/` へコピー
3. `lib/utils.ts`、`lib/constants.ts` をコピー
4. `calculateSettlements()` を純粋関数として `src/lib/settlements.ts` に切り出し
5. Svelte 5 ストア実装（優先順）:
   - `src/lib/stores/persistence.svelte.ts`（sessionStorage 同期ユーティリティ）
   - `src/lib/stores/btc-price.svelte.ts`（BTC 価格・レート制限）
   - `src/lib/stores/calculator.svelte.ts`（スタンドアローンモード全状態）
   - `src/lib/stores/settlement-sync.svelte.ts`（`useSettlementSync` の移植）
6. `events.ts` の `nostr-tools` import を `@rx-nostr/crypto` に差し替え

### Phase 3: UI コンポーネント変換

1. shadcn-svelte で必要コンポーネントを追加:
   ```bash
   npx shadcn-svelte@latest add button card dialog select tabs avatar checkbox scroll-area badge
   ```
2. 低複雑度から順に変換:
   - `member-avatar.svelte`
   - `currency-switcher.svelte`
   - `price-footer.svelte`
   - `expense-list.svelte`
3. 中複雑度:
   - `expense-form.svelte`
   - `settlement-list.svelte`
   - `settlement-header.svelte`
   - `lightning-payment-modal.svelte`
4. 高複雑度:
   - `member-list.svelte`（Nostr プロフィール取得）
   - `split-calculator.svelte`（スタンドアローン）
   - `split-calculator-sync.svelte`（同期モード）

### Phase 4: ページ・ルーティング

1. `src/routes/+layout.svelte`（フォント・Sonner Toaster・Analytics）
2. `src/routes/+page.svelte`:
   - URL パラメータ `?s=` `?t=` を検出して自動で同期モードへ
   - モードなし → スタンドアローンモード表示
   - `goto()` で URL を更新（セッション作成時）

### Phase 5: テスト・品質

1. `*.spec.ts` を作成（「テスト方針」参照）
2. `vp test` で全 spec 通過を確認
3. `vp check`（型チェック + lint + format）をパス
4. `vp build` で静的ファイル生成確認
5. `wss://` リレー接続・イベント発行の動作確認

---

## テスト方針

### コロケーション方式（`*.spec.ts`）

テストファイルはテスト対象ファイルと **同じディレクトリ** に配置する。
`__tests__/` ディレクトリは使用しない。ファイル名は `*.spec.ts`。

```
src/lib/
├── settlements.ts
├── settlements.spec.ts            ← 割り勘計算ロジック
├── nostr/
│   ├── lightning.ts
│   ├── lightning.spec.ts
│   └── settlement/
│       ├── capability.ts
│       ├── capability.spec.ts
│       ├── events.ts
│       ├── events.spec.ts
│       ├── state.ts
│       ├── state.spec.ts
│       ├── relay-rx.ts
│       ├── relay-rx.spec.ts
│       ├── id.ts
│       ├── id.spec.ts
│       ├── storage.ts
│       └── storage.spec.ts
└── stores/
    ├── settlement-sync.svelte.ts
    ├── settlement-sync.spec.ts
    ├── btc-price.svelte.ts
    └── btc-price.spec.ts
```

### 現行テストの移植対応表

| 現行 (`__tests__/*.test.ts`) | 移行後 (`*.spec.ts` コロケーション) | 備考 |
|-----------------------------|----------------------------------|------|
| `__tests__/capability.test.ts` | `settlement/capability.spec.ts` | そのまま移植 |
| `__tests__/events.test.ts` | `settlement/events.spec.ts` | import パス修正のみ |
| `__tests__/state.test.ts` | `settlement/state.spec.ts` | そのまま移植 |
| `__tests__/relay.test.ts` | `settlement/relay-rx.spec.ts` | そのまま移植 |
| `__tests__/id.test.ts` | `settlement/id.spec.ts` | そのまま移植 |
| `__tests__/hooks.test.ts` | `stores/settlement-sync.spec.ts` | クラス API に合わせて書き直し |
| （新規） | `lib/settlements.spec.ts` | `calculateSettlements()` 純粋関数 |
| （新規） | `stores/btc-price.spec.ts` | fetch モック・レート制限ロジック |

### Vitest 設定

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/vitest.setup.ts'],
  },
})
```

### テスト作成の優先度

1. **高（移植必須）**: `capability.spec.ts`、`events.spec.ts`、`state.spec.ts`、`id.spec.ts`
2. **高（書き直し）**: `settlement-sync.spec.ts`（`useSettlementSync` → クラスに対応）
3. **中**: `settlements.spec.ts`（割り勘計算の純粋関数）
4. **低**: `btc-price.spec.ts`、`relay-rx.spec.ts`（fetch/WebSocket モック）

---

## 注意点・リスク

| 項目 | 内容 |
|------|------|
| Vite+ アルファ版 | `vp create svelte` のテンプレートが安定していない可能性。問題があれば `pnpm create svelte@latest` にフォールバック |
| shadcn-svelte Tailwind v4 対応 | shadcn-svelte の Tailwind v4 サポートは beta 段階。CSS 変数の構造を要確認 |
| `useSettlementSync` の Svelte 5 runes 化 | `$derived.by` で非同期 derived を扱う場合の API が Svelte 5 で変わっている点に注意 |
| rx-nostr + SvelteKit SSR | ブラウザ API を参照するためビルドエラーになる可能性。`if (browser)` ガードで対処 |
| QR コード | `qrcode.react` の代替は `qrcode` (npm) + SVG 生成、または `@bitrequest/qr` を検討 |
| `nostr-tools` 除外 | `@rx-nostr/crypto` の `finalizeEvent` / `generateSecretKey` / `getPublicKey` が同等 API を提供していることを事前確認。型 `NostrEvent` は `rx-nostr` からインポート、または `events/types.ts` の自前定義を継続使用 |
| テスト命名規則 | Vitest の `include` パターンを `src/**/*.spec.ts` に統一。既存の `*.test.ts` は移行時に `*.spec.ts` にリネームする |

---

## 検証方法

```bash
vp dev          # 開発サーバー起動、UI 動作確認
vp test         # Vitest でビジネスロジックのテスト実行
vp check        # 型チェック + lint + format
vp build        # 静的ファイル生成（build/ に出力）
```

ビルド後の動作確認項目:

1. スタンドアローンモードでメンバー追加・支出登録・精算確認
2. 同期モードでセッション作成 → 招待 URL → 別タブで参加 → 支出追加が反映
3. ページリロード後のデータ保持（sessionStorage）
4. Lightning 決済モーダル + QR コード表示

---

## 現行プロジェクトのレビュー指摘事項（移行時に対応推奨）

移行と同時に以下の既知バグを修正する:

- **[C2]** Capability ハッシュの衝突: `'\0'` セパレータを追加
  ```typescript
  // capability.ts
  const input = inviteToken + '\0' + pubkey  // セパレータ追加
  ```
- **[H1]** 浮動小数点: 金額を整数（円・セント）で扱う（`Math.round` の適用箇所を統一）
- **[H2]** イベント重複排除の競合状態: `SettlementSync` クラスの `#seenIds` フィールドで自然に解決
- **[H3]** アンマウント後の state 更新: Svelte の `$effect` はコンポーネント破棄時に自動クリーンアップ（自然に解決）
- **[H4]** 入力バリデーション: `addExpense` / `addMember` でイベント作成前に型・範囲チェックを追加
