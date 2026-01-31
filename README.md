# ワリカンさん (Split Bill Calculator on Nostr)

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ocknamos-projects/v0-split-bill-calculator)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/fto6thqGyy9)

## 概要

**ワリカンさん**は、グループでの支払いを簡単に精算できるWebアプリケーションです。Nostrプロトコルを活用したリアルタイム同期機能により、複数人で同時に支出を記録・管理できます。

### 主な機能

- 💰 **割り勘計算**: メンバーと支出を登録して自動的に精算額を計算
- 🔄 **リアルタイム同期**: Nostrプロトコルによる分散型データ同期
- ⚡ **Lightning支払い**: Lightning Network (LNURL-pay) による即座の支払い
- 🌐 **複数通貨対応**: JPY/USD対応、Bitcoin価格表示
- 📱 **レスポンシブデザイン**: モバイル・デスクトップ両対応
- 🔒 **プライバシー重視**: 一時鍵による匿名参加、招待トークンベースのアクセス制御

## デモ

**[https://vercel.com/ocknamos-projects/v0-split-bill-calculator](https://vercel.com/ocknamos-projects/v0-split-bill-calculator)**

## 技術スタック

### フロントエンド
- **Next.js 16** (React 19) - App Router
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Radix UI** - アクセシブルなUIコンポーネント
- **Lucide React** - アイコン

### Nostr統合
- **nostr-tools** - Nostrプロトコル実装
- **カスタムSettlementプロトコル** - 割り勘専用のイベント設計

### 状態管理・データ永続化
- **React Hooks** - ローカル状態管理
- **SessionStorage** - スタンドアロンモードのデータ永続化
- **Nostr Relays** - 同期モードの分散データストレージ

### テスト
- **Vitest** - ユニットテスト
- **Testing Library** - コンポーネントテスト

## プロジェクト構造

```
split-bill-calculator-on-nostr/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # メインページ（モード選択・ルーティング）
│   ├── layout.tsx                # ルートレイアウト
│   └── globals.css               # グローバルスタイル
│
├── components/                   # Reactコンポーネント
│   ├── split-calculator.tsx      # スタンドアロン割り勘計算機
│   ├── split-calculator-sync.tsx # Nostr同期版割り勘計算機
│   ├── lightning-payment-modal.tsx # Lightning支払いモーダル
│   ├── recipient-avatar.tsx      # 受取人アバター
│   ├── theme-provider.tsx        # ダーク/ライトモード
│   ├── split-calculator/         # 割り勘計算機サブコンポーネント
│   │   ├── create-settlement-dialog.tsx
│   │   ├── currency-switcher.tsx
│   │   ├── expense-form.tsx
│   │   ├── expense-list.tsx
│   │   ├── lock-settlement-dialog.tsx
│   │   ├── member-avatar.tsx
│   │   ├── member-list.tsx
│   │   ├── price-footer.tsx
│   │   ├── settlement-header.tsx
│   │   ├── settlement-list.tsx
│   │   ├── sync-mode-selector.tsx
│   │   └── sync-status-indicator.tsx
│   └── ui/                       # 再利用可能なUIコンポーネント (Radix UI)
│
├── lib/                          # ユーティリティ・ビジネスロジック
│   ├── constants.ts              # 定数（リレー、API URL等）
│   ├── utils.ts                  # 汎用ユーティリティ
│   └── nostr/                    # Nostr関連ロジック
│       ├── index.ts              # Nostrモジュールエントリーポイント
│       ├── lightning.ts          # Lightning Network (LNURL) 統合
│       ├── profile.ts            # Nostrプロフィール取得
│       └── settlement/           # Settlement プロトコル実装
│           ├── index.ts          # Settlement モジュールエクスポート
│           ├── id.ts             # Settlement ID生成・検証
│           ├── capability.ts     # 招待トークン・アクセス制御
│           ├── events.ts         # Nostrイベント作成・パース
│           ├── state.ts          # イベントから状態を構築
│           ├── relay.ts          # Relayクライアント
│           ├── hooks.ts          # React Hooks (同期・招待リンク)
│           ├── events/
│           │   └── types.ts      # イベント型定義
│           └── __tests__/        # ユニットテスト
│
├── hooks/                        # カスタムReact Hooks
│   ├── use-btc-price.ts          # Bitcoin価格取得
│   ├── use-currency.ts           # 通貨変換・フォーマット
│   ├── use-mobile.ts             # モバイル判定
│   ├── use-persisted-state.ts    # SessionStorage永続化
│   ├── use-settlements.ts        # 精算計算ロジック
│   └── use-toast.ts              # トースト通知
│
├── types/                        # TypeScript型定義
│   ├── split-calculator.ts       # 割り勘計算機の型
│   └── nostr.ts                  # Nostr関連の型
│
├── public/                       # 静的ファイル
│   └── (icons, images)
│
└── styles/                       # スタイルファイル
    └── globals.css
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

- Node.js 18以上
- pnpm / npm / yarn

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

ブラウザで `http://localhost:3000` を開きます。

### ビルド

```bash
# プロダクションビルド
pnpm build

# ビルドしたアプリを起動
pnpm start
```

### テスト

```bash
# テストを実行
pnpm test:run
```

## 使い方

### スタンドアロンモード

1. 「スタンドアロン」を選択
2. メンバーを追加（Nostr npub指定でプロフィール・Lightning支払い対応）
3. 支出を記録
4. 自動計算された精算額を確認
5. Lightning支払いで即座に送金（対応メンバーのみ）

### 同期モード

1. 「新しい精算を作成」を選択
2. 精算名と通貨を設定
3. 招待リンクを共有
4. 参加者が同じリンクからアクセス
5. リアルタイムで支出が同期される
6. Ownerが精算をロックして確定

## 環境変数

現在、環境変数は不要です。すべての設定は `lib/constants.ts` で管理されています。

## デプロイ

### Vercel (推奨)

```bash
# Vercel CLIでデプロイ
vercel
```

または、GitHubリポジトリをVercelに接続して自動デプロイ。

## ライセンス

MIT

## 貢献

Issue・Pull Requestを歓迎します！

## 開発者

- [@ocknamo](https://github.com/ocknamo)

## 関連リンク

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [Lightning Network](https://lightning.network/)
- [LNURL](https://github.com/lnurl/luds)
