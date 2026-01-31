#!/bin/bash

# アプリケーションを起動するスクリプト

PORT=3000
PROJECT_DIR="/home/yoshiki/workspace/nostr/split-bill-calculator-on-nostr"

echo "[INFO] アプリケーションを起動します..."
echo ""

# プロジェクトディレクトリに移動
cd "$PROJECT_DIR" || exit 1

# ポートが使用中かチェック
echo "[INFO] ポート $PORT の使用状況を確認中..."
if command -v lsof &> /dev/null; then
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "[WARNING] ポート $PORT は既に使用されています（PID: $PID）"
        echo ""
        echo "実行中のプロセス情報:"
        ps -p $PID -o pid,ppid,cmd
        echo ""
        echo "このプロセスを停止してから再度実行してください。"
        echo "停止方法: kill $PID"
        exit 1
    fi
fi

echo "[OK] ポート $PORT は使用可能です"
echo ""

# 依存関係のチェック
if [ ! -d "node_modules" ]; then
    echo "[INFO] 依存関係をインストール中..."
    pnpm install
    echo ""
fi

# アプリケーションを起動
echo "[INFO] 開発サーバーを起動中..."
echo "   URL: http://localhost:$PORT"
echo ""
echo "停止するには Ctrl+C を押してください"
echo ""

pnpm dev
