# 設計書: ワリカンさん (Split Bill Calculator on Nostr)

## 1. システム概要

### 1.1 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|----------|
| フレームワーク | Next.js (App Router) + React | 16 / 19 |
| 言語 | TypeScript (strict) | - |
| スタイリング | Tailwind CSS + Radix UI + shadcn/ui | v4 |
| Nostrライブラリ | nostr-tools | v2.22.1 |
| Nostrリアクティブ | rx-nostr | v3.6.2 |
| テスト | Vitest + Testing Library | - |
| Linter/Formatter | Biome | - |
| 外部API | CoinGecko、LNURL | - |

### 1.2 デフォルトNostrリレー

```
wss://relay.damus.io
wss://nos.lol
wss://relay.snort.social
wss://yabu.me
wss://r.kojira.io
```

---

## 2. アーキテクチャ

### 2.1 レイヤー構成

```
app/page.tsx                 ← エントリポイント・モード選択
        ↓
components/
  split-calculator.tsx                  ← スタンドアローンモード
  split-calculator-sync.tsx             ← 同期モード
        ↓
hooks/
  use-settlements.ts                    ← 割り勘計算ロジック
  use-currency.ts                       ← 通貨変換・フォーマット
  use-btc-price.ts                      ← ビットコイン価格取得
  use-persisted-state.ts                ← SessionStorage永続化
        ↓
lib/nostr/settlement/
  events.ts                             ← Nostrイベント生成・パース
  state.ts                              ← イベントからステート構築
  capability.ts                         ← CAP認可ロジック
  relay-rx.ts                           ← リレー通信（rx-nostr）
  hooks.ts                              ← useSettlementSync Reactフック
  storage.ts                            ← オーナー鍵の永続化
        ↓
外部サービス
  Nostrリレー / CoinGecko API / LNURL
```

### 2.2 コンポーネント構成（同期モード）

```
SplitCalculatorSync（メインコンテナ）
├── SettlementHeader（ナビゲーション・セッション情報）
├── SyncStatusIndicator（接続ステータス表示）
├── MemberList（メンバー表示・追加）
│   └── MemberAvatar（プロフィール画像・名前）
├── ExpenseForm（支出入力フォーム）
├── ExpenseList（支出一覧）
├── SettlementList（精算リスト）
│   ├── MemberAvatar（債務者・債権者）
│   └── Lightning 決済ボタン
├── LightningPaymentModal（LNURL-pay決済）
├── LockSettlementDialog（オーナー専用：精算確定）
├── CreateSettlementDialog（初回セッション作成）
└── CurrencySwitcher（JPY / USD 切り替え）
```

---

## 3. Nostrカスタムプロトコル

### 3.1 イベント種別

| Kind | イベント名 | 用途 | 可変性 | 署名者 |
|------|-----------|------|--------|--------|
| 30050 | Settlement | 精算セッション定義（名前・通貨） | 置換可能（Parameterized Replaceable） | オーナーのみ |
| 30051 | Member | メンバーリスト | 置換可能 | オーナーのみ |
| 1052 | Expense | 支出記録 | 追記のみ（Append-only） | 招待トークン所持者 |
| 30053 | Lock | 精算確定（採用イベントID指定） | 置換可能 | オーナーのみ |

### 3.2 共通タグ構造

| タグ | 値 | 説明 |
|-----|-----|------|
| `d` | settlementId（UUID v4） | 精算セッション識別子 |
| `owner` | オーナーの公開鍵（hex） | セッションオーナーの識別 |
| `invite_hash` | `SHA256(inviteToken)` | 招待トークンのハッシュ（セキュリティ境界） |
| `cap` | `SHA256(inviteToken + pubkey)` | 支出イベントの認可証明（Expenseのみ） |

### 3.3 セキュリティモデル（Capability-based Access Control）

```
【オーナーが生成】
  inviteToken   = 32バイトランダム hex（秘密・URLにのみ含まれる）
  inviteHash    = SHA256(inviteToken)  ← Nostrリレーに公開

【参加者が支出を追加する際】
  cap = SHA256(inviteToken + 自分のpubkey)  ← ExpenseEventに含める

【バリデーション時】
  expectedCap = SHA256(inviteToken + 発行者pubkey)
  isValid     = (cap === expectedCap)
```

**セキュリティ特性:**
- inviteToken はリレーに送信されない → 傍受不可
- cap は行為者ごとに異なる → リプレイ攻撃防止
- エフェメラル鍵ペアで参加 → 匿名性の確保

---

## 4. データモデル

### 4.1 ドメイン型

```typescript
// メンバー
interface Member {
  id: string           // UUID（スタンドアローン）or pubkey（同期）
  name: string
  npub?: string        // Nostr公開鍵（bech32形式）
  nostrProfile?: NostrProfile
}

// 支出
interface Expense {
  id: string
  description: string
  amount: number
  paidById: string     // MemberのID
  currency: 'jpy' | 'usd'
}

// 精算結果
interface Settlement {
  from: string         // 支払う人のMemberID
  to: string           // 受け取る人のMemberID
  amount: number
}
```

### 4.2 SettlementState（同期モード内部ステート）

```typescript
interface SettlementState {
  settlement: SettlementEvent | null
  members: MemberEvent | null
  expenses: ExpenseEvent[]
  lock: LockEvent | null
  isLocked: boolean
}
```

---

## 5. 割り勘計算アルゴリズム

**実装場所:** `hooks/use-settlements.ts`

### 5.1 手順（最小決済数アルゴリズム・貪欲法）

```
1. 全支出の合計を計算
   totalAmount = Σ expenses[i].amount

2. 1人あたりの負担額を計算
   perPerson = totalAmount / members.length

3. 各メンバーの残高を計算
   balance[m] = (mが支払った合計) - perPerson

4. 残高を分類
   creditors = balance > +0.01  （受け取るべき人）
   debtors   = balance < -0.01  （支払うべき人）

5. 貪欲法でマッチング
   while (creditors と debtors が残っている) {
     amount = min(creditor.balance, |debtor.balance|)
     settlements.push({ from: debtor, to: creditor, amount })
     残高を更新
   }
```

### 5.2 実装上の注意

- 浮動小数点誤差対策: 0.01 未満の差は誤差として無視
- 金額の丸め: `Math.round(amount)` で整数化
- パフォーマンス: `useMemo` でメモ化（不要な再計算を防止）

### 5.3 計算例

```
メンバー: Alice, Bob, Charlie
支出:
  - Alice が $300 支払い（夕食）
  - Bob が $100 支払い（飲み物）
  - Charlie が $0 支払い

1人あたり: $400 / 3 = $133.33

残高:
  Alice:   $300 - $133.33 = +$166.67（受け取り）
  Bob:     $100 - $133.33 = -$33.33（支払い）
  Charlie: $0   - $133.33 = -$133.33（支払い）

精算結果:
  Bob → Alice: $33.33
  Charlie → Alice: $133.33
```

---

## 6. データフロー

### 6.1 同期モード: セッション作成

```
CreateSettlementDialog
  ├── settlementId = UUID v4 生成
  ├── inviteToken  = 32バイトランダム hex 生成
  ├── オーナー鍵ペア生成（SecretKey + PublicKey）
  ├── SettlementEvent 作成・署名・リレー発行（Kind 30050）
  ├── MemberEvent 作成・署名・リレー発行（Kind 30051）
  └── 招待URL生成: https://example.com/?s={settlementId}&t={inviteToken}
```

### 6.2 同期モード: セッション参加

```
URLパラメータ取得 (?s, ?t)
  ├── settlementId, inviteToken を抽出
  ├── エフェメラル鍵ペア生成（参加者用・一時的）
  ├── リレーから対象イベント取得（filter: #d = settlementId）
  │   （Kind 30050, 30051, 1052, 30053 すべて）
  ├── buildSettlementState() でステート構築
  └── UI描画
```

### 6.3 支出追加

```
ExpenseForm 入力
  ├── CAP = SHA256(inviteToken + 自分のpubkey) 計算
  ├── ExpenseEvent 作成・署名（Kind 1052）
  ├── リレーへ発行
  ├── ローカルのイベントセットに追加（重複排除）
  └── ステート再構築 → UI更新
```

### 6.4 精算ロック（オーナーのみ）

```
LockSettlementDialog
  ├── 有効な支出イベントIDの一覧を選定
  ├── LockEvent 作成・署名（Kind 30053）
  ├── accepted_event_ids タグに採用イベントID列挙
  ├── リレーへ発行
  └── ロック後: accepted_event_ids に含まれないExpenseは無効
```

### 6.5 Lightning 決済

```
SettlementList の決済ボタン押下
  ├── 受取人の Nostr プロフィールから lud16（Lightning Address）取得
  ├── LNURL-pay info 取得: https://{domain}/.well-known/lnurlp/{name}
  ├── 金額指定でインボイスリクエスト
  ├── Lightning インボイス取得
  └── QRコード表示 or 決済リンクを開く
```

---

## 7. ステート管理

### 7.1 スタンドアローンモード

- `usePersistedState` フックで SessionStorage に自動保存・自動読み込み
- 保存対象: メンバーリスト・支出リスト・支払い済みフラグ・通貨設定

### 7.2 同期モード（イベントソーシング）

```
Nostrリレーから受信したイベント群
  ↓
Set<EventId> で重複排除
  ↓
buildSettlementState(events, inviteToken, settlementId)
  ├── categorizeEvents()  ← Kind別に仕分け
  ├── バリデーション      ← CAP検証・メンバー確認
  └── SettlementState     ← 単一の正規ステートに集約
  ↓
React setState() → UI 再レンダリング
```

### 7.3 接続ステータス

| 状態 | 説明 |
|------|------|
| `connecting` | リレーへの接続試行中 |
| `connected` | 接続成功・データ受信済み |
| `disconnected` | 接続なし |
| `error` | 接続エラー |

---

## 8. ファイル構成

```
/
├── app/
│   └── page.tsx                          # エントリポイント・モード選択
├── components/
│   ├── split-calculator.tsx              # スタンドアローンモードUI
│   ├── split-calculator-sync.tsx         # 同期モードUI
│   ├── lightning-payment-modal.tsx       # Lightning決済モーダル
│   └── split-calculator/
│       ├── expense-form.tsx              # 支出入力フォーム
│       ├── expense-list.tsx              # 支出一覧
│       ├── member-list.tsx               # メンバー一覧
│       ├── settlement-list.tsx           # 精算リスト
│       ├── currency-switcher.tsx         # 通貨切り替え
│       └── lock-settlement-dialog.tsx    # 精算確定ダイアログ
├── hooks/
│   ├── use-settlements.ts                # 割り勘計算ロジック
│   ├── use-currency.ts                   # 通貨変換・フォーマット
│   ├── use-btc-price.ts                  # BTC価格取得
│   ├── use-persisted-state.ts            # SessionStorage永続化
│   ├── use-mobile.ts                     # モバイル判定
│   └── use-toast.ts                      # トースト通知
├── lib/
│   ├── constants.ts                      # リレーURL・API設定・定数
│   ├── utils.ts                          # ユーティリティ関数
│   └── nostr/
│       ├── index.ts                      # モジュールエクスポート
│       ├── profile.ts                    # Nostrプロフィール取得
│       ├── lightning.ts                  # LNURL連携
│       └── settlement/
│           ├── id.ts                     # settlementId生成（UUID v4）
│           ├── capability.ts             # CAP計算・検証
│           ├── events.ts                 # イベント生成・パース・バリデーション
│           ├── state.ts                  # イベントからステート構築
│           ├── relay.ts                  # リレークライアント（nostr-tools）
│           ├── relay-rx.ts               # リレークライアント（rx-nostr）
│           ├── hooks.ts                  # useSettlementSync フック
│           ├── storage.ts                # オーナー鍵の永続化
│           └── __tests__/               # ユニットテスト群
├── types/
│   ├── split-calculator.ts               # ドメイン型定義
│   └── nostr.ts                          # Nostr関連型定義
└── styles/                               # グローバルスタイル
```

---

## 9. テスト構成

**テストランナー:** Vitest + happy-dom + Testing Library

| ファイル | テスト対象 |
|---------|-----------|
| `id.test.ts` | settlementId 生成・バリデーション |
| `capability.test.ts` | CAP計算・検証ロジック |
| `events.test.ts` | イベント生成・パース・バリデーション |
| `state.test.ts` | buildSettlementState() のロジック |
| `relay.test.ts` | リレー通信の抽象化 |
| `hooks.test.ts` | useSettlementSync Reactフック統合 |

---

## 10. 外部連携仕様

### 10.1 Nostrリレー

- プロトコル: WebSocket（wss://）
- フィルタリング: `#d` タグ（settlementId）+ Kind指定
- ライブラリ: rx-nostr（グローバルシングルトン `getRxNostr()`）

### 10.2 CoinGecko API

- エンドポイント: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy,usd`
- レート制限: HTTP 429 応答時は1分間クールダウン
- キャッシュ: なし（毎回フェッチ）

### 10.3 LNURL-pay

1. Lightning Address: `name@domain` 形式
2. Well-known取得: `GET https://domain/.well-known/lnurlp/name`
3. インボイスリクエスト: callback URLに金額（ミリサトシ）を指定
4. 応答の `pr`（payment request）をQRコード・リンクとして表示

---

## 11. 開発コマンド

```bash
pnpm dev          # 開発サーバー起動 (localhost:3000)
pnpm build        # プロダクションビルド
pnpm start        # プロダクションサーバー起動
pnpm test         # テスト（ウォッチモード）
pnpm test:run     # テスト（一回実行）
pnpm lint         # コード品質チェック
pnpm lint:fix     # 自動修正
pnpm format       # コードフォーマット
```
