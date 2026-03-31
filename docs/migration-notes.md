# SvelteKit + Vite マイグレーション記録

Next.js / React から SvelteKit 2 + Svelte 5 + Vite へのマイグレーションで詰まったポイントと意思決定をまとめた記録。
今後 Vite + SvelteKit でアプリを構築するときの参考に。

---

## 最終的な技術スタック

| 項目 | 移行前 | 移行後 |
|------|--------|--------|
| フレームワーク | Next.js (React) | SvelteKit 2 + Svelte 5 (Runes) |
| ビルドツール | next | vite@^7.0.0 |
| テスト | — | vitest@^3 + @testing-library/svelte@^5 |
| CSS | Tailwind CSS v3 | Tailwind CSS v4 (@tailwindcss/vite) |
| パッケージマネージャー | npm | pnpm v10 |
| デプロイ | — | GitHub Pages (adapter-static) |
| 開発環境 | — | StackBlitz (WebContainer / NABE) |

---

## 主要な設定ファイルと要点

### `svelte.config.js`

```js
import adapter from "@sveltejs/adapter-static";

const dev = process.env.NODE_ENV === 'development';

const config = {
  kit: {
    adapter: adapter({ fallback: 'index.html' }),  // ★ SPA必須
    paths: {
      base: dev ? '' : '/your-repo-name',           // ★ GitHub Pages必須
    },
  },
};
```

**ポイント:**
- `fallback: 'index.html'` がないと、動的ルーティングがあるビルドで `"all routes must be fully prerenderable"` エラーになる
- `kit.paths.base` は GitHub Pages のサブパス（リポジトリ名）に合わせる。`dev` フラグで開発時は空にする

### `vite.config.ts`

```ts
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    allowedHosts: true,  // ★ WebContainer / StackBlitz必須
  },
});
```

**ポイント:**
- `server.allowedHosts: true` がないと StackBlitz / WebContainer の環境でリクエストがブロックされ白画面になる
- **`allowedHosts: "all"` は誤り**: Vite 内部で `[..."all"]` = `["a","l","l"]` に展開されてしまう。必ず `true` を使う

### `vitest.config.ts`（vite.config.ts とは分離）

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";   // ★ "vite" ではなく "vitest/config"
import { sveltekit } from "@sveltejs/kit/vite"; // ★ svelte() ではなく sveltekit()

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: [
      // Svelte 5 コンポーネントテスト: SSR ではなくクライアントモジュールを使う
      {
        find: /^svelte$/,
        replacement: fileURLToPath(
          new URL("node_modules/svelte/src/index-client.js", import.meta.url)
        ),
      },
    ],
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.spec.ts"],
    setupFiles: ["src/vitest.setup.ts"],
  },
});
```

**ポイント:**
- `defineConfig` は必ず `"vitest/config"` からインポート。`"vite"` からだと `test` プロパティが認識されず `vitest` モジュール自体が解決できないエラーになる
- プラグインは `svelte()` ではなく `sveltekit()` を使う。`svelte()` だと `$lib` エイリアスが `vi.mock()` のパス解決に使われず、モックが適用されないことがある
- Svelte 5 コンポーネントのテストは svelte の SSR モジュールを避けるため、`svelte` を `index-client.js` にエイリアスする必要がある

### `src/routes/+layout.ts`

```ts
export const ssr = false
export const prerender = false
```

**ポイント:** SPA モードでは SSR を無効化する。これがないと dev サーバーで `window` など ブラウザ専用 API を使う処理が SSR 時に実行されてクラッシュし、白画面になる。

### `package.json`（pnpm v10 対応）

```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

**ポイント:** pnpm v10 はセキュリティ上の理由でビルドスクリプトをデフォルトでブロックする。`esbuild` はネイティブバイナリのダウンロードにインストールスクリプトが必要なので明示的に許可する。

---

## 詰まったポイントと解決策

### 1. `adapter-static` でビルドが失敗する

**症状:**
```
Error: all routes must be fully prerenderable...
```

**原因:** `adapter-static` のデフォルトは全ルートを事前レンダリングしようとするが、動的なページがあると失敗する。

**解決策:** SPA モードにする。
```js
adapter: adapter({ fallback: 'index.html' })
```

---

### 2. pnpm v10 で esbuild が動かない

**症状:**
```
Error: Cannot find native binding.
Ignored build scripts: esbuild@x.x.x. Run 'pnpm approve-builds' to pick which dependencies should be allowed to run scripts.
```

**原因:** pnpm v10 からビルドスクリプトがデフォルトブロックになった。esbuild はインストール時にプラットフォーム別バイナリをダウンロードするスクリプトを走らせるが、それがブロックされる。

**解決策:** `package.json` に許可リストを追加。
```json
"pnpm": {
  "onlyBuiltDependencies": ["esbuild"]
}
```
その後 `node_modules` を削除して `pnpm install` を再実行。

---

### 3. vite-plus が WebContainer (StackBlitz) で動かない

**症状:** `vp dev` 実行時に
```
Error: Cannot find native binding.
```

**原因:** vite-plus は Rolldown（Rust 製バンドラー）をネイティブバイナリ（`.node` ファイル）として使う。StackBlitz の WebContainer はブラウザ内で動く Node.js 環境のためネイティブバイナリが実行できない。

**解決策:** vite-plus を削除し、標準の `vite` + `vitest` に置き換える。

**意思決定:**
- vite-plus は Rolldown による高速ビルドが売りだが、WebContainer との互換性がない
- 標準 vite に戻すことでエコシステムの安定性と互換性を優先

---

### 4. dev サーバーは起動するが白画面（SSR クラッシュ）

**症状:** `pnpm dev` は起動するが、ブラウザでアクセスすると白画面。ターミナルに以下のようなエラー。
```
@sveltejs/kit/src/runtime/client/state.svelte.js
at async SSRCompatModuleRunner.getModuleInformation
```

**原因:**
- SvelteKit は `adapter-static` + `fallback: 'index.html'` でも dev サーバーでは SSR を実行する
- `window.location.href` 等のブラウザ専用 API が SSR 時に実行されてクラッシュ
- また、Vite 6 の `SSRCompatModuleRunner` は SvelteKit の `state.svelte.js`（Svelte 5 Runes を使う内部ファイル）を正しく処理できない

**解決策（2 段階）:**
1. `src/routes/+layout.ts` に `export const ssr = false` を追加して SSR を無効化
2. `vite@^6` → `vite@^7` にアップグレード（vite-plus が内部で使っていた Vite 7 と合わせる）

---

### 5. GitHub Pages で白画面（base path の未設定）

**症状:**
```
GET https://ocknamo.github.io/_app/immutable/entry/start.xxx.js net::ERR_ABORTED 404
```

**原因:** GitHub Pages はリポジトリ名がサブパスになる（`https://user.github.io/repo-name/`）。しかし SvelteKit がビルドしたアセットのパスはルート `/` を想定していた。

**解決策:** `svelte.config.js` で本番時のみ base path を設定。
```js
const dev = process.env.NODE_ENV === 'development';
// ...
paths: {
  base: dev ? '' : '/your-repo-name',
},
```

---

### 6. StackBlitz (WebContainer) で白画面（allowedHosts）

**症状:** dev サーバーは起動、アプリも GitHub Pages では表示されるのに StackBlitz のプレビューが白画面。URL は `*.local-credentialless.webcontainer.io` 形式。

**原因:** Vite 6.2 から DNS rebinding 攻撃対策として、`localhost` 以外のホスト名からのリクエストをブロックするようになった。StackBlitz のプロキシ URL（`*.webcontainer.io`）がブロックされていた。

**ハマりポイント:**
- `allowedHosts: "all"` は**誤り**。JavaScript の文字列スプレッド `[..."all"]` = `["a","l","l"]` となり、実質何もマッチしない
- 正しくは `allowedHosts: true`

**解決策:**
```ts
server: {
  allowedHosts: true,
},
```

---

### 7. Svelte 5 コンポーネントのテストが "mount is not available on the server" エラー

**症状:**
```
Error: mount(...) is not available on the server
```

**原因:** vitest がテスト実行時に Svelte の SSR モジュール（`svelte/src/index-server.js`）を使ってしまう。`@testing-library/svelte` の `render()` はクライアント側の `mount()` を使うため、SSR モジュールでは使えない。

**解決策:** `vitest.config.ts` に `svelte` モジュールをクライアント版にエイリアスする設定を追加。
```ts
resolve: {
  alias: [
    {
      find: /^svelte$/,
      replacement: fileURLToPath(
        new URL("node_modules/svelte/src/index-client.js", import.meta.url)
      ),
    },
  ],
},
```

---

### 8. `vi.mock()` のファクトリ内 `vi.fn()` が `undefined` を返す

**症状:** テストの `expect(mock).toHaveBeenCalledWith(...)` で `settlementId: undefined` のような値になる。

**原因:**
vitest 3 では `vi.clearAllMocks()` が `vi.mock()` ファクトリ内で作られた `vi.fn()` の実装（`mockReturnValue` など）もリセットすることがある。

```ts
// ❌ 問題のあるパターン
vi.mock('$lib/something', () => ({
  myFunc: vi.fn().mockReturnValue('value'),  // afterEach でリセットされる可能性
}))
```

**解決策:** `vi.hoisted()` で全モック関数を定義し、`beforeEach` で戻り値を明示的に再設定する。

```ts
// ✅ 正しいパターン
const { mockMyFunc } = vi.hoisted(() => ({
  mockMyFunc: vi.fn().mockReturnValue('value'),
}))

vi.mock('$lib/something', () => ({
  myFunc: mockMyFunc,
}))

describe('...', () => {
  beforeEach(() => {
    mockMyFunc.mockReturnValue('value')  // 毎回明示的にセット
  })
})
```

**参考:** vitest 公式ドキュメントにも「vi.mock ファクトリ内の vi.fn() は vi.hoisted() を使うことを推奨」と記載がある。

---

### 9. `svelte.config.js` の `kit.alias` が `.svelte-kit/tsconfig.json` に残留

**症状:** `svelte-kit sync` を実行しても古い設定（`vite-plus` へのパス）が `.svelte-kit/tsconfig.json` に残り、型エラーや解決エラーが発生。

**原因:** `kit.alias` に設定したものは `svelte-kit sync` で自動生成される `tsconfig.json` の `paths` に書き込まれる。不要なエイリアスを削除しても `.svelte-kit/` がキャッシュされていると残留する。

**解決策:**
1. `svelte.config.js` から不要な `kit.alias` を削除
2. `.svelte-kit/` ディレクトリを削除
3. `pnpm prepare`（= `svelte-kit sync`）で再生成

---

### 10. `vitest.config.ts` で `sveltekit()` vs `svelte()` プラグイン

**症状:** `svelte()` プラグインを使ったとき、`vi.mock('$lib/...')` が Svelte コンポーネント内のインポートに適用されない。コンポーネントがモックされていない実際の関数を呼び出し、`undefined` が返る。

**原因:**
`sveltekit()` プラグインは `$lib` を `src/lib` にマッピングする設定を内部で持つ。`svelte()` プラグインはこれを持たないため、コンポーネント内の `$lib/...` インポートとテスト内の `vi.mock('$lib/...')` のパス解決が一致しないことがある。

**解決策:** vitest.config.ts では `svelte()` ではなく `sveltekit()` を使う。

---

## 意思決定まとめ

### vite-plus をやめた理由

当初のマイグレーションは `vite-plus`（Rolldown ベースの実験的ツール）を使っていた。StackBlitz の WebContainer 環境でネイティブバイナリが動作しないという根本的な制約から、標準 `vite` + `vitest` に変更した。

- **メリット失った点:** Rolldown による高速ビルド（vite-plus の主な利点）
- **得たもの:** WebContainer 互換性、エコシステムの安定性、ドキュメントが豊富

### Vite 6 ではなく Vite 7 を選んだ理由

移行直後に `vite@6` を指定したところ、SvelteKit 内部の `state.svelte.js`（Svelte 5 Runes を使うファイル）が Vite 6 の `SSRCompatModuleRunner` で処理できずクラッシュした。`vite-plus` が内部で使っていた Vite 7 に合わせることで解決。SvelteKit のピア依存も `^7.0.0` をサポートしている。

### SSR を無効化した理由

このアプリは純粋な SPA（Nostr リレーとのリアルタイム通信が主な機能）であり、SEO や初期表示速度の要件が SSR を必要としない。`adapter-static` + `fallback: 'index.html'` で SPA として動作させ、`ssr = false` で dev サーバーでも SSR をスキップするのが最もシンプルな構成。

---

## 今後の SvelteKit + Vite アプリ構築チェックリスト

- [ ] `adapter-static` を SPA モードで使う場合は `fallback: 'index.html'` を設定する
- [ ] GitHub Pages にデプロイする場合は `kit.paths.base` を設定する
- [ ] StackBlitz / WebContainer で開発する場合は `server.allowedHosts: true` を設定する（`"all"` は誤り）
- [ ] SSR が不要な場合は `+layout.ts` に `export const ssr = false` を追加する
- [ ] pnpm v10 を使う場合は `pnpm.onlyBuiltDependencies: ["esbuild"]` を追加する
- [ ] vitest の設定は `"vitest/config"` の `defineConfig` を使い、`sveltekit()` プラグインを含める
- [ ] Svelte 5 コンポーネントのテストでは `svelte` を `index-client.js` にエイリアスする
- [ ] `vi.mock()` ファクトリ内の `vi.fn()` はすべて `vi.hoisted()` に移し、`beforeEach` で戻り値を再設定する
- [ ] vite のバージョンは `@sveltejs/kit` の peer dependency と合わせる（現在は `^7.0.0`）
- [ ] Vite + SvelteKit の vitest.config と vite.config は分離する
