# AGENTS.md - AI開発者向けガイドライン

## プロジェクト概要

**ワリカンさん (Split Bill Calculator on Nostr)** は、Nostrプロトコルを活用した分散型の割り勘計算アプリケーションです。

### コアコンセプト

1. **2つの動作モード**
   - **スタンドアロンモード**: ローカル（SessionStorage）でデータを管理
   - **同期モード**: Nostr Relayを使用した分散型リアルタイム同期

2. **Nostr Settlement プロトコル**
   - 独自のイベント種別（Kind 38400-38403）を使用
   - Capability-based access control（招待トークン）
   - Parameterized replaceable events（最新が有効）

3. **Lightning Network統合**
   - LNURL-payによる即座の支払い
   - Nostrプロフィールからlud16を取得

## アーキテクチャ

### ディレクトリ構造の重要ポイント

```
lib/nostr/settlement/  # Nostr Settlement プロトコルの実装
├── id.ts              # Settlement ID生成（16バイトhex）
├── capability.ts      # 招待トークン・SHA-256ベースのcap検証
├── events.ts          # イベント作成・パース・検証
├── state.ts           # イベント集合から状態を構築
├── relay.ts           # Relay通信（SimplePool wrapper）
└── hooks.ts           # React Hooks（useSettlementSync等）
```

### データフロー

#### スタンドアロンモード
```
User Input → React State → SessionStorage
                ↓
         Calculation Logic
                ↓
         Display Results
```

#### 同期モード
```
User Input → React State → Nostr Event → Relay
                              ↓
                    Other Participants
                              ↓
                    Relay → Event Stream → State Builder → Display
```

## コーディング規約

### リント・フォーマット

このプロジェクトでは、コード品質とスタイルの一貫性を保つために**Biome**を使用しています。

```bash
# リント実行（問題を検出）
pnpm lint

# リント実行 + 自動修正
pnpm lint:fix

# フォーマットのみ実行
pnpm format
```

**Biome設定** (`biome.json`):
- インデントスタイル: スペース2つ
- クォートスタイル: シングルクォート
- セミコロン: 必要な場合のみ (`asNeeded`)
- 行幅: 100文字
- import自動整理: 有効

### TypeScript

- **厳格な型定義**: `any`の使用を避ける（Biomeで警告）
- **明示的な戻り値の型**: 関数には必ず戻り値の型を指定
- **Null安全性**: `null`と`undefined`を適切に処理
- **型import**: 型のみのimportは`import type`を使用（Biomeが自動修正）

### React

- **関数コンポーネント**: クラスコンポーネントは使用しない
- **Hooks**: カスタムHooksは`hooks/`ディレクトリに配置
- **"use client"ディレクティブ**: クライアントコンポーネントには必須
- **未使用変数**: `_`プレフィックスで意図を明示（Biomeが自動修正）

### Nostr

- **イベント署名**: `finalizeEvent()`を使用
- **イベント検証**: 受信したイベントは必ず検証
- **Relay接続**: 使用後は必ず`close()`

## 重要な実装パターン

### 1. Settlement State構築

`lib/nostr/settlement/state.ts`の`buildSettlementState()`は、イベント集合から状態を構築します。

```typescript
// イベントをカテゴリ分け
const events = categorizeEvents(allEvents, settlementId)

// Settlement定義を取得（必須）
const settlement = findValidSettlement(events.settlements)

// 最新のMemberイベントを取得
const memberEvent = findLatestValidMemberEvent(events.members, ownerPubkey)

// Lockイベントをチェック
const lockEvent = findValidLockEvent(events.locks, ownerPubkey)

// Expenseイベントを検証・フィルタリング
const validExpenses = await validateExpenses(events.expenses, inviteToken, members)
```

**重要**: ロック後は`accepted_event_ids`に含まれるイベントのみが有効です。

### 2. Capability検証

`lib/nostr/settlement/capability.ts`で実装されています。

```typescript
// Expenseイベント作成時
const cap = await calculateCap(inviteToken, actorPubkey)
// cap = SHA256(inviteToken + actorPubkey)

// Expenseイベント検証時
const isValid = await verifyCap(cap, inviteToken, actorPubkey)
```

**セキュリティ**: 招待トークンは秘密情報です。URLパラメータで共有されますが、Relayには送信されません（ハッシュのみ）。

### 3. React Hooks使用パターン

#### useSettlementSync

```typescript
const {
  state,           // SettlementState | null
  isLoading,       // boolean
  error,           // string | null
  isLocked,        // boolean
  isOwner,         // boolean
  connectionStatus,// ConnectionStatus
  addExpense,      // (memberPubkey, amount, currency, note) => Promise<void>
  addMember,       // (pubkey, name) => Promise<void>
  lockSettlement,  // (acceptedEventIds) => Promise<void>
  refresh,         // () => Promise<void>
} = useSettlementSync({ settlementId, inviteToken, relays })
```

**注意**: 
- `addExpense`は誰でも呼べますが、capability検証が必要
- `addMember`と`lockSettlement`はOwnerのみ有効

### 4. Parameterized Replaceable Events

Settlement、Member、Lockイベントは`d`タグで識別され、同じ`d`タグの最新イベントが有効です。

```typescript
// 最新のイベントを取得
const latest = events.reduce((latest, current) =>
  current.created_at > latest.created_at ? current : latest
)
```

## テスト戦略

### ユニットテスト

`lib/nostr/settlement/__tests__/`にテストファイルがあります。

```bash
pnpm test:run
```

**テスト対象**:
- ID生成・検証
- Capability計算・検証
- イベント作成・パース
- State構築ロジック
- Relay通信

### テスト作成時の注意点

- **非同期処理**: `async/await`を適切に使用
- **モック**: Relay通信はモック化
- **ケース**: 正常系とエッジケースを考慮する

## デバッグのヒント

### Nostr関連

```typescript
// イベントのログ出力
console.log("[v0] Event:", JSON.stringify(event, null, 2))

// Relay接続状態の確認
console.log("[v0] Connection status:", connectionStatus)

// State構築の確認
console.log("[v0] Settlement state:", state)
```

## パフォーマンス最適化

### React

- **useMemo**: 計算コストの高い処理
- **useCallback**: 関数の再生成を防ぐ
- **React.memo**: コンポーネントの再レンダリングを防ぐ

### Nostr

- **イベントフィルタリング**: 必要なイベントのみ取得
- **Relay選択**: 応答の速いRelayを優先
- **接続管理**: 不要な接続は即座にclose

## セキュリティ考慮事項

### 重要な原則

1. **秘密鍵の管理**
   - 秘密鍵はメモリ内のみ（永続化しない）
   - スタンドアロンモードでは秘密鍵不要

2. **招待トークン**
   - URLパラメータで共有
   - Relayには送信しない（ハッシュのみ）
   - 推測困難な長さ（16バイト以上）

3. **入力検証**
   - ユーザー入力は必ず検証
   - XSS対策（Reactが自動処理）
   - 金額の範囲チェック

## 外部API

### CoinGecko API

```typescript
// lib/constants.ts
export const COINGECKO_API_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy,usd"
```

**レート制限**: 無料プランは制限あり。`use-btc-price.ts`でエラーハンドリング実装済み。

### LNURL

```typescript
// Lightning Address (lud16) から LNURL-pay情報を取得
const lnurlInfo = await fetchLnurlPayInfo(lud16)

// インボイスを取得
const invoice = await fetchLightningInvoice(callback, amountMsat)
```

## リソース

### 公式ドキュメント

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)

### 関連NIP（Nostr Implementation Possibilities）

- [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic protocol
- [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md): bech32-encoded entities (npub)
- [NIP-33](https://github.com/nostr-protocol/nips/blob/master/33.md): Parameterized Replaceable Events

## 変更履歴の管理

### コミットメッセージ規約

```
<type>: <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

---

**最終更新**: 2026/2/1
**バージョン**: 1.0.0
