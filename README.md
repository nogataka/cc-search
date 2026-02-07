# CC Viewer

**Claude Code** と **Codex** の会話ログを閲覧・検索できる統合ログビューアーです。

ローカルに保存されたセッションファイル（`~/.claude/projects/`、`~/.codex/sessions/`）を読み取り、プロジェクト単位・セッション単位で会話の内容を確認できます。

## クイックスタート

```bash
npx cc-viewer
```

これだけで起動します。ブラウザで http://localhost:5858 を開いてください。

> Node.js 20.12.0 以上が必要です。

## 主な機能

### プロジェクト一覧

- Claude Code / Codex をタブで切り替え
- プロジェクト名・パスでの検索フィルター
- ソート（最終更新日 / プロジェクト名 / セッション数）
- グリッド表示 / リスト表示の切り替え

### セッション一覧

- プロジェクト内のセッションをカード形式で表示
- フィルター設定（折りたたみ式）
  - ユーザーメッセージのないセッションを非表示
  - 同一タイトルのセッションを統合（最新のみ表示）
- Claude Code セッションはコスト・モデル名も表示

### セッション詳細

- **左サイドバー**: セッション一覧（ワンクリックで切り替え）、設定タブ
- **スティッキーヘッダー**: セッションタイトル、プロジェクトパス、セッションID（コピー可）、コスト・トークン情報
- **会話ビュー**: ユーザーメッセージ、アシスタント応答、ツール使用、思考ブロックを構造的に表示
- **フローティングボタン**: 会話の先頭 / 末尾へスクロール
- **モバイル対応**: レスポンシブデザイン、モバイル用サイドバー

### 全文検索

- Claude Code・Codex の全セッションを横断検索
- 検索対象ソースの選択（チェックボックス）
- マッチ箇所をハイライト表示
- 検索結果からセッション詳細へ直接ジャンプ

## セットアップ

### 必要なもの

- Node.js 20.12.0 以上
- pnpm 10.8.1

### インストール

```bash
git clone https://github.com/nogataka/cc-viewer.git
cd cc-viewer
pnpm install
```

### 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで http://localhost:5858 を開きます。

### プロダクションビルド

```bash
pnpm build
pnpm start
```

## 読み取るデータ

CC Viewer は以下のディレクトリからセッションデータを読み取ります（読み取り専用）。

| ソース | パス |
|---|---|
| Claude Code | `~/.claude/projects/<projectId>/<sessionId>.jsonl` |
| Codex | `~/.codex/sessions/<workspacePath>/<sessionId>.jsonl` |

### Claude Code セッション

- JSONL 形式の会話ログ（user / assistant / system / summary）
- ツール使用（tool_use）、ツール結果（tool_result）、思考ブロック（thinking）を構造的にパース
- API コスト（USD）、トークン使用量（入力・出力・キャッシュ）、モデル名を自動集計

### Codex セッション

- JSONL 形式のターンベースログ
- ユーザーメッセージ、アシスタント応答、ツールコール・結果をペアリング表示
- XML コマンドペイロードのパース対応

## 設定

設定はブラウザの Cookie に保存され、セッション一覧ページやサイドバーの設定タブから変更できます。

| 設定項目 | デフォルト | 説明 |
|---|---|---|
| `hideNoUserMessageSession` | `true` | ユーザーメッセージのないセッションを非表示 |
| `unifySameTitleSession` | `true` | 同一タイトルのセッションを統合 |
| `enterKeyBehavior` | `shift-enter-send` | 送信キーの動作（`shift-enter-send` / `enter-send`） |

## 開発

```bash
# Lint
pnpm lint

# フォーマット＆Lint 自動修正
pnpm fix

# 型チェック
pnpm typecheck

# テスト
pnpm test
```

## 技術スタック

- **フレームワーク**: Next.js 15 (React 19, Turbopack)
- **API**: Hono + Zod バリデーション
- **状態管理**: TanStack React Query, Jotai
- **UI**: Tailwind CSS 4, Radix UI, Lucide Icons
- **Markdown**: react-markdown + remark-gfm + react-syntax-highlighter
- **ツール**: Biome (formatter/linter), Vitest, TypeScript

## ライセンス

MIT
