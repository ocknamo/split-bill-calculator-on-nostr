# ワリカンさん (Split Bill Calculator on Nostr)

[![CI](https://github.com/ocknamo/split-bill-calculator-on-nostr/actions/workflows/ci.yml/badge.svg)](https://github.com/ocknamo/split-bill-calculator-on-nostr/actions/workflows/ci.yml)

## 概要

**ワリカンさん**は、グループでの支払いを簡単に精算できるWebアプリケーションです。Nostrプロトコルを活用したリアルタイム同期機能により、複数人で同時に支出を記録・管理できます。

### 主な機能

- 💰 **割り勘計算**: メンバーと支出を登録して自動的に精算額を計算
- 🔄 **リアルタイム同期**: Nostrプロトコルによる分散型データ同期
- ⚡ **Lightning支払い**: Lightning Network (LNURL-pay) による即座の支払い
- 🌐 **複数通貨対応**: JPY/USD対応、Bitcoin価格表示
- 📱 **レスポンシブデザイン**: モバイル・デスクトップ両対応
- 🔒 **プライバシー重視**: 一時鍵による匿名参加、招待トークンベースのアクセス制御

## 技術スタック

### フロントエンド
- **SvelteKit 2** + **Svelte 5** (runes) - SPA
- **TypeScript** - 型安全性
- **Tailwind CSS v4** - スタイリング
- **Lucide Svelte** - アイコン
- **vite-plus** - ビルドツール

### Nostr統合
- **rx-nostr** - リアクティブな Nostr クライアント
- **nostr-tools** - Nostr プロトコル実装
- **カスタム Settlement プロトコル** - 割り勘専用のイベント設計

### 状態管理・データ永続化
- **Svelte 5 runes** (`$state`, `$effect`, `$derived`) - リアクティブな状態管理
- **SessionStorage** - スタンドアロンモードのデータ永続化
- **Nostr Relays** - 同期モードの分散データストレージ

### テスト
- **Vitest** - ユニットテスト・統合テスト
- **@testing-library/svelte** - コンポーネントテスト

## プロジェクト構造

```
split-bill-calculator-on-nostr/
├── src/
│   ├── routes/
│   │   ├── +page.svelte              # メインページ（モード選択・ルーティング）
│   │   ├── +layout.svelte            # ルートレイアウト (OGP メタデータ)
│   │   └── layout.css                # グローバルスタイル
│   │
│   └── lib/
│       ├── components/               # Svelte コンポーネント
│       │   ├── SplitCalculator.svelte       # スタンドアロン割り勘計算機
│       │   ├── SplitCalculatorSync.svelte   # Nostr同期版割り勘計算機
│       │   ├── LightningPaymentModal.svelte # Lightning支払いモーダル
│       │   ├── CreateSettlementDialog.svelte
│       │   ├── LockSettlementDialog.svelte
│       │   ├── MemberList.svelte
│       │   ├── ExpenseForm.svelte
│       │   ├── ExpenseList.svelte
│       │   ├── SettlementHeader.svelte
│       │   ├── SettlementList.svelte
│       │   ├── SyncModeSelector.svelte
│       │   ├── CurrencySwitcher.svelte
│       │   ├── PriceFooter.svelte
│       │   └── MemberAvatar.svelte
│       │
│       ├── nostr/                    # Nostr 関連ロジック
│       │   ├── lightning.ts          # Lightning Network (LNURL) 統合
│       │   ├── profile-rx.ts         # Nostr プロフィール取得
│       │   ├── rx-nostr-client.ts    # rx-nostr クライアント設定
│       │   └── settlement/           # Settlement プロトコル実装
│       │       ├── capability.ts     # 招待トークン・アクセス制御
│       │       ├── events.ts         # Nostr イベント作成・パース
│       │       ├── id.ts             # Settlement ID 生成・検証
│       │       ├── state.ts          # イベントから状態を構築
│       │       ├── relay-rx.ts       # Relay クライアント (rx-nostr)
│       │       ├── settlement-sync.svelte.ts  # 同期クラス (Svelte 5 runes)
│       │       └── storage.ts        # オーナー鍵の永続化
│       │
│       ├── stores/
│       │   └── btc-price.svelte.ts   # Bitcoin 価格ストア (Svelte 5 runes)
│       │
│       ├── types/                    # TypeScript 型定義
│       ├── utils/                    # ユーティリティ関数
│       ├── settlements.ts            # 精算計算アルゴリズム
│       └── constants.ts              # 定数（リレー、API URL 等）
│
├── static/                           # 静的ファイル
├── svelte.config.js                  # SvelteKit 設定 (adapter-static)
├── vite.config.ts                    # Vite 設定
└── tsconfig.json                     # TypeScript 設定
```

## Nostr Settlement プロトコル

このアプリケーションは、Nostr上で割り勘を管理するための独自プロトコルを実装しています。

### イベント種別

| Kind | 名前 | 説明 | 署名者 |
|------|------|------|--------|
| `38400` | Settlement | 精算セッションの定義 | Owner |
| `38401` | Member | メンバーリスト | Owner |
| `38402` | Expense | 支出記録 | 任意の参加者 (capability検証) |
| `38403` | Lock | 精算のロック（確定） | Owner |

### アーキテクチャの特徴

1. **Capability-based Access Control**
   - 招待トークンによるアクセス制御
   - トークンを知る者のみが支出を追加可能
   - SHA-256ハッシュによる検証

2. **Parameterized Replaceable Events**
   - Settlement/Member/Lockイベントは更新可能
   - 最新のイベントが有効

3. **分散型データストレージ**
   - 複数のNostr Relayに分散保存
   - 単一障害点なし

4. **一時鍵による匿名性**
   - 参加者は一時的な鍵ペアを使用
   - Nostrアカウント不要で参加可能

## セットアップ

### 前提条件

- Node.js 22以上
- pnpm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/ocknamo/split-bill-calculator-on-nostr.git
cd split-bill-calculator-on-nostr

# 依存関係をインストール
pnpm install

# 開発サーバーを起動
pnpm dev
```

ブラウザで `http://localhost:5173` を開きます。

### ビルド

```bash
# プロダクションビルド
pnpm build

# ビルドしたアプリをプレビュー
pnpm preview
```

### テスト

```bash
# テストを実行
pnpm test

# 型チェック
pnpm check
```

## 使い方

### スタンドアロンモード

1. 「スタンドアロン」を選択
2. メンバーを追加（Nostr npub指定でプロフィール・Lightning支払い対応）
3. 支出を記録
4. 自動計算された精算額を確認
5. Lightning支払いで即座に送金（対応メンバーのみ）

### 同期モード (Nostr)

1. 「Nostr同期」タブを選択し「新しい精算を作成」
2. 精算名と通貨を設定
3. 招待リンクを共有
4. 参加者が同じリンクからアクセス
5. リアルタイムで支出が同期される
6. Ownerが精算をロックして確定

## デプロイ

GitHub Pages へ自動デプロイ（`main` ブランチへのプッシュで発火）。

## ライセンス

MIT

## 貢献

Issue・Pull Requestを歓迎します！

## 開発者

- [@ocknamo](https://github.com/ocknamo)

## 関連リンク

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [rx-nostr](https://github.com/penpenpng/rx-nostr)
- [Lightning Network](https://lightning.network/)
- [LNURL](https://github.com/lnurl/luds)
- [SvelteKit](https://svelte.dev/docs/kit)
