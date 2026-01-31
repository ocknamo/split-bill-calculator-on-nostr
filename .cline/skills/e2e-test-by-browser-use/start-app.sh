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

# アプリケーションをバックグラウンドで起動
echo "[INFO] 開発サーバーを起動中..."
echo "   URL: http://localhost:$PORT"
echo ""

# ログディレクトリを作成
LOG_DIR="$PROJECT_DIR/log"
mkdir -p "$LOG_DIR"

# バックグラウンドでサーバーを起動し、ログファイルに出力
LOG_FILE="$LOG_DIR/dev-server.log"
pnpm dev > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "[INFO] サーバーをバックグラウンドで起動しました（PID: $SERVER_PID）"
echo "[INFO] ログファイル: $LOG_FILE"
echo ""

# サーバーが起動するまで待機（最大30秒）
echo "[INFO] サーバーの起動を待機中..."
MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # curlでヘルスチェック
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null | grep -q "200\|301\|302\|404"; then
        echo "[OK] サーバーが起動しました！"
        echo ""
        echo "=========================================="
        echo "開発サーバーが正常に起動しました"
        echo "URL: http://localhost:$PORT"
        echo "PID: $SERVER_PID"
        echo "ログ: $LOG_FILE"
        echo "=========================================="
        echo ""
        echo "サーバーを停止するには: kill $SERVER_PID"
        echo ""
        exit 0
    fi
    
    # プロセスが終了していないかチェック
    if ! ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "[ERROR] サーバープロセスが予期せず終了しました"
        echo ""
        echo "ログの最後の10行:"
        tail -n 10 "$LOG_FILE"
        exit 1
    fi
    
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    echo -n "."
done

echo ""
echo "[ERROR] サーバーの起動がタイムアウトしました（${MAX_WAIT}秒）"
echo ""
echo "ログの最後の20行:"
tail -n 20 "$LOG_FILE"
echo ""
echo "サーバープロセスを停止します..."
kill $SERVER_PID 2>/dev/null
exit 1
