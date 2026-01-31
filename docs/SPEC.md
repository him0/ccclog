# Claude Code CHANGELOG Viewer 仕様書

## 1. 概要

### 1.1 目的
Claude Code の変更履歴（CHANGELOG）を日本語/英語の並列テーブル形式で閲覧できる静的Webアプリケーション。

### 1.2 技術スタック
| 項目 | 技術 |
|------|------|
| フレームワーク | Astro 5.x（SSG） |
| 検索エンジン | Fuse.js 7.x |
| ビルドツール | tsx, TypeScript 5.x |
| パッケージマネージャー | pnpm |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |

---

## 2. 機能要件

### 2.1 データ表示

#### 2.1.1 月別グループ化
- 変更履歴を月単位でグループ化して表示
- 各月グループは折りたたみ可能（`<details>`要素）
- 最新月はデフォルトで展開、それ以外は折りたたみ
- 月ヘッダーにリリース数と変更項目数を表示

#### 2.1.2 バージョンセクション
- 各バージョンごとにセクションを表示
- 表示項目：
  - バージョン番号（例: v2.1.23）
  - 月内アップデート順序番号（例: | #3 - その月の3番目のリリース）
  - リリース日（日本語形式: 2026年1月29日）
  - 変更エントリテーブル
- 月内アップデート順序番号は、その月の何度目のアップデートかを示す（1から始まる連番）
- 月内のバージョンはリリース日降順（同日の場合はsemver降順）でソート

#### 2.1.3 テーブル形式
| 列 | 内容 |
|----|------|
| 日本語 | 変更内容の日本語説明 |
| English | 変更内容の英語説明 |

#### 2.1.4 エントリタイプの視覚的識別
変更内容の先頭キーワードに応じて左ボーダー色を変更：

| キーワード | 色 | カラーコード |
|-----------|-----|-------------|
| Added / Add / 追加 | 緑 | #3fb950 |
| Fixed / Fix / bugfixes / 修正 | オレンジ | #f0883e |
| Changed / Change / 変更 | 紫 | #a371f7 |
| Improved / Improve / 改善 | 青 | #79c0ff |
| Other / その他 | グレー | #8b949e |

**プレフィックス除外**
以下の形式のプレフィックスは判定時に除外される：
- `[Tag]` 形式（例: `[IDE]`, `[VSCode]`）
- `Tag:` 形式（例: `Bedrock:`, `Windows:`）

### 2.2 検索機能

#### 2.2.1 全文検索
- Fuse.js によるファジー検索
- 日本語・英語両方の列を検索対象
- 検索閾値（threshold）: 0.3
- 位置非依存検索（ignoreLocation: true）

#### 2.2.2 検索UI
- 検索ボックス（プレースホルダー: 「検索... (日本語/English)」）
- クリアボタン（入力時に表示）
- 検索結果件数の表示
- 結果なし時のメッセージ表示

#### 2.2.3 検索結果の表示
- マッチしたエントリのみ表示
- マッチしないバージョン・月グループを非表示
- マッチ箇所のハイライト表示（黄色背景）
- 検索結果がある月グループは自動展開
- バッククォート内のテキストは `<code>` 表示を維持

#### 2.2.4 キーボード操作
- `Escape`キー: 検索クリア
- デバウンス: 150ms

#### 2.2.5 URLパラメータ
- `?q=検索語` でページ読み込み時に検索を実行

### 2.3 レスポンシブデザイン
- デスクトップ・モバイル両対応
- ブレークポイント: 768px
- モバイルでのフォントサイズ調整（iOS ズーム防止: 16px）

### 2.4 複数年対応

#### 2.4.1 年別ページ
- 動的ルーティング `[year].astro` により、年ごとのページを自動生成
- 対応年は `content/CHANGELOG_*_JA.md` のファイル存在から自動検出
- トップページ（`/`）は最新年にリダイレクト

#### 2.4.2 年切り替えナビゲーション
- 年一覧は `content/` ディレクトリから動的に取得
- ハードコードを排除し、新年追加時の手動変更を不要に
- ヘッダーに年切り替えリンクを表示
- 現在表示中の年はアクティブ状態で強調表示
- クリックで年間を切り替え可能

---

## 3. データ仕様

### 3.1 入力データ

#### 3.1.1 年別CHANGELOGファイル
年ごとに分離されたMarkdownファイル（`content/` ディレクトリに配置）：
- `content/CHANGELOG_2026_JA.md`: 2026年のリリース（v2.1.0以降）
- `content/CHANGELOG_2025_JA.md`: 2025年のリリース（v2.0.x以前）

形式：
```markdown
## 2.1.23

| 日本語 | English |
|--------|---------|
| 変更内容（日本語） | Change description (English) |
| ... | ... |

## 2.1.22
...
```

### 3.2 生成データ

#### 3.2.1 年別JSONファイル
年ごとに分離されたJSONファイル：
- `src/data/changelog-2026.json`: 2026年のデータ
- `src/data/changelog-2025.json`: 2025年のデータ

```typescript
interface ChangelogData {
  generatedAt: string;        // ISO 8601形式の生成日時
  months: MonthGroup[];
}

interface MonthGroup {
  key: string;                // "2026-01"
  label: string;              // "2026年1月"
  versions: Version[];
}

interface Version {
  version: string;            // "2.1.23"
  releaseDate: string;        // "2026-01-29"
  releaseDateDisplay: string; // "2026年1月29日"
  entries: Entry[];
}

interface Entry {
  ja: string;                 // 日本語説明
  en: string;                 // 英語説明
}
```

#### 3.2.2 年別Markdownファイル
- `generated/CHANGELOG-2026.md`: 2026年の整形済みMarkdown
- `generated/CHANGELOG-2025.md`: 2025年の整形済みMarkdown

### 3.3 リリース日取得

#### 3.3.1 取得元の優先順位
日付の正確性を最大化するため、以下の優先順位で取得：

| 優先度 | ソース | 説明 |
|--------|--------|------|
| 1 | npm レジストリ | 実際の公開日（最も正確） |
| 2 | GitHub タグ | npm 未公開の場合、タグ作成日を使用 |
| 3 | 補間 | 上記で取得できない場合、近隣バージョンから推定 |

#### 3.3.2 npm レジストリからの取得
- パッケージ名: `@anthropic-ai/claude-code`
- 取得コマンド: `npm view @anthropic-ai/claude-code time --json`
- 全バージョンの公開日を一括取得
- レート制限なし

#### 3.3.3 日時変換
- npm レジストリ: UTC
- 表示: JST（UTC+9）
- 変換式: `new Date(utcDate).getTime() + 9 * 60 * 60 * 1000`

#### 3.3.4 GitHub タグからの取得
- GitHub Releases API を使用
- タグ名から `v` プレフィックスを除去してバージョン番号を取得
- `published_at` フィールドをJSTに変換して使用

#### 3.3.5 補間ロジック
npm および GitHub タグで取得できないバージョン（未公開・削除済み等）は近隣バージョンの日付から推定：
- 前方（新しいバージョン）と後方（古いバージョン）を探索
- 両方見つかった場合は新しい方の日付を使用

---

## 4. ビルドプロセス

### 4.1 データフロー

#### 4.1.1 Markdown生成時のエスケープ
テーブル形式のMarkdownを生成する際、エントリ内のパイプ文字（`|`）は `\|` にエスケープする。

```
npm レジストリ  +  GitHub CHANGELOG.md
     │                    │
     ▼                    ▼
         sync-versions.ts
                 │
                 ▼
     CHANGELOG_{YEAR}_JA.md (新バージョン自動追記)
                 │
─────────────────┼─────────────────────────────────
                 │
CHANGELOG_{YEAR}_JA.md  +  npm レジストリ / GitHub Releases API
         │                       │
         ▼                       ▼
   parse-changelog.ts    fetch-releases.ts
         │                       │
         └───────┬───────────────┘
                 ▼
         generate-data.ts [year]
                 │
         ┌───────┴───────┐
         ▼               ▼
 changelog-{year}.json  CHANGELOG-{year}.md
         │
         ▼
   Astro SSG Build → dist/
                       ├── index.html (2026)
                       └── 2025/index.html
```

### 4.2 新バージョン自動検出（sync-versions.ts）

#### 4.2.1 処理フロー
1. npm レジストリから `@anthropic-ai/claude-code` の全バージョン一覧と公開日を取得
2. 当該年（現在の年、JST基準）の `CHANGELOG_{YEAR}_JA.md` から既存バージョンを抽出
3. 未記載バージョンを特定
4. GitHub の `CHANGELOG.md` から各バージョンの変更内容（英語）を取得
5. 未記載バージョンを当該年のファイルに追記

※ 過去年の CHANGELOG は既に整備済みのため、当該年のみを対象とする

#### 4.2.2 自動翻訳
新バージョン検出時に Claude Code CLI を使用して英語エントリを日本語に自動翻訳：

| 項目 | 内容 |
|------|------|
| 翻訳ツール | Claude Code CLI (`claude --print --model sonnet`) |
| 翻訳モデル | Claude Sonnet（品質とコストのバランス） |
| 認証方式 | OAuth トークン（サブスクリプション） |
| 環境変数 | CLAUDE_CODE_OAUTH_TOKEN |

**翻訳プロンプト:**
- Claude Code の変更履歴として適切な技術用語の翻訳
- 簡潔で自然な日本語
- 各エントリを1行で翻訳

**フォールバック処理:**
- Claude Code CLI が利用不可の場合: 「（翻訳待ち）」として追記
- 翻訳エラーの場合: 「（翻訳待ち）」として追記
- これによりビルドは常に成功する

#### 4.2.3 追記形式
```markdown
## X.Y.Z

| 日本語 | English |
|--------|---------|
| 翻訳済みテキスト | Original English text from GitHub CHANGELOG |
```

※ API キー未設定時やエラー時は「翻訳済みテキスト」が「（翻訳待ち）」になる

#### 4.2.4 年の判定
- npm 公開日を JST に変換して年を判定
- UTC 15:00 以降は翌日としてカウント（JST 0:00）

#### 4.2.5 挿入位置
- 新しいバージョンはファイルの先頭（ヘッダー直後）に追加
- バージョン番号の降順を維持

### 4.3 翻訳待ちエントリの再翻訳（retranslate.ts）

#### 4.3.1 概要
「（翻訳待ち）」となっているエントリを検出し、Claude Code CLI で再翻訳するスクリプト。

#### 4.3.2 処理フロー
1. `CHANGELOG_{YEAR}_JA.md` から「（翻訳待ち）」を含むバージョンを検出
2. 対象バージョンの英語エントリを抽出
3. Claude Code CLI で日本語に翻訳
4. 翻訳結果で「（翻訳待ち）」を置換
5. ファイルを上書き保存

#### 4.3.3 対象ファイル
- 引数なし: 当該年（JST基準）のファイルのみ
- 引数あり: 指定された年のファイル（例: `pnpm retranslate 2025`）

#### 4.3.4 実行タイミング
- ローカル: 手動で `pnpm retranslate` を実行
- CI: `workflow_dispatch` で「再翻訳モード」を選択時

#### 4.3.5 エラーハンドリング
- Claude Code CLI が利用不可: エラーメッセージを表示して終了
- 翻訳失敗: 該当エントリをスキップし、次のエントリを処理
- 部分的な成功でもファイルは更新される

### 4.4 npm scripts

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動（localhost:4321） |
| `pnpm preview` | ビルド結果のプレビュー |
| `pnpm build` | データ生成 + 静的サイトビルド |
| `pnpm generate` | 全年のデータ生成（2026年 + 2025年） |
| `pnpm sync-versions` | npm レジストリから新バージョンを検出し CHANGELOG に追記 |
| `pnpm retranslate` | 「（翻訳待ち）」エントリを再翻訳（引数で年指定可） |

---

## 5. デプロイ仕様

### 5.1 GitHub Pages

#### 5.1.1 設定
- Source: GitHub Actions
- Base URL: `/ccclog/`
- Trailing Slash: always

#### 5.1.2 トリガー
| トリガー | タイミング |
|---------|-----------|
| push | mainブランチへのプッシュ時 |
| schedule | 日本時間 6:00, 9:00, 12:00, 18:00 |
| workflow_dispatch | 手動実行（オプションで再翻訳モード選択可） |

#### 5.1.2.1 手動実行オプション
| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| retranslate | 「（翻訳待ち）」エントリを再翻訳 | false |

#### 5.1.3 新バージョン自動検出・追記
定期ビルド時に以下の処理を実行：
1. `pnpm run sync-versions` で npm レジストリから新バージョンを検出
2. 新バージョンがあれば `CHANGELOG_{YEAR}_JA.md` に自動追記
3. 変更があれば自動コミット・プッシュ
4. 通常のビルド・デプロイを実行

これにより、npm に新バージョンが公開されると最大6時間以内に自動的に CHANGELOG に追加される。

### 5.2 ビルド環境
- OS: ubuntu-latest
- Node.js: 22
- pnpm: 10

---

## 6. ファイル構成

```
ccclog/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CDワークフロー
├── content/                        # ソースデータ（入力）
│   ├── CHANGELOG_2025_JA.md        # 元データ（2025年）
│   └── CHANGELOG_2026_JA.md        # 元データ（2026年）
├── docs/
│   └── SPEC.md                     # 本仕様書
├── generated/
│   ├── CHANGELOG-2026.md           # 生成されるMarkdown（2026年）
│   └── CHANGELOG-2025.md           # 生成されるMarkdown（2025年）
├── public/
│   └── favicon.svg                 # サイトアイコン
├── scripts/
│   ├── fetch-releases.ts           # GitHub API連携
│   ├── generate-data.ts            # データ生成メイン（年引数対応）
│   ├── parse-changelog.ts          # Markdownパーサー
│   ├── retranslate.ts              # 翻訳待ちエントリの再翻訳
│   └── sync-versions.ts            # 新バージョン自動検出・追記
├── src/
│   ├── components/
│   │   ├── MonthGroup.astro        # 月グループコンポーネント
│   │   ├── SearchBox.astro         # 検索UIコンポーネント
│   │   └── VersionSection.astro    # バージョンセクション
│   ├── data/
│   │   ├── changelog-2026.json     # 生成されるJSONデータ（2026年）
│   │   └── changelog-2025.json     # 生成されるJSONデータ（2025年）
│   ├── layouts/
│   │   └── BaseLayout.astro        # 共通レイアウト（年ナビ含む）
│   └── pages/
│       ├── index.astro             # トップページ（最新年にリダイレクト）
│       └── [year].astro            # 年別ページ（動的ルーティング）
├── astro.config.mjs                # Astro設定
├── package.json
└── tsconfig.json
```

---

## 7. UI仕様

### 7.1 カラーパレット（ダークテーマ）

| 用途 | 変数名 | 値 |
|-----|--------|-----|
| 背景 | --color-bg | #0d1117 |
| 背景（二次） | --color-bg-secondary | #161b22 |
| ボーダー | --color-border | #30363d |
| テキスト | --color-text | #e6edf3 |
| テキスト（薄） | --color-text-muted | #8b949e |
| アクセント | --color-accent | #58a6ff |

### 7.2 フォント

| 用途 | フォントファミリー |
|-----|-------------------|
| 本文 | -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif |
| コード | 'SF Mono', 'Fira Code', 'Consolas', monospace |

### 7.3 レイアウト
- 最大幅: 1200px
- パディング: 2rem 1.5rem（デスクトップ）、1rem（モバイル）

### 7.4 フッター

| 要素 | 内容 |
|-----|------|
| 著作権表示 | © 2026 びーぐる(Beagle Works) |
| ソーシャルリンク | X (Twitter) アイコン、RSSアイコン（著作権表示の後） |
| 外部リンク | Claude Code (GitHub), Claude.ai |

---

## 8. 制約事項

### 8.1 既知の制限
- GitHub API レート制限: 認証なしで60リクエスト/時間
- 検索はクライアントサイドで実行されるため、データ量が増えるとパフォーマンスに影響

### 8.2 前提条件
- CHANGELOG_2026_JA.md が指定のMarkdown形式に従っていること
- GitHub Releasesのタグ名が `vX.Y.Z` 形式であること

### 8.3 セキュリティ要件

#### 8.3.1 XSS/HTML注入対策
GitHub CHANGELOG 等の外部データを HTML として表示する際は、以下のルールに従う：

| 処理順序 | 内容 |
|---------|------|
| 1 | HTML特殊文字（`<`, `>`, `&`, `"`, `'`）をエスケープ |
| 2 | バッククォート（`` ` ``）で囲まれた部分のみ `<code>` タグに変換 |

**対象箇所:**
- `VersionSection.astro`: テーブルセル表示
- `index.astro`: 検索結果のハイライト表示

#### 8.3.2 コマンドインジェクション対策
外部データを含むコマンドを実行する際は、シェルを経由せずに直接実行する：

| 禁止 | 推奨 |
|------|------|
| `execSync(\`cmd "${data}"\`)` | `execFileSync('cmd', [data])` |

**対象箇所:**
- `sync-versions.ts`: Claude CLI 呼び出し
- `retranslate.ts`: Claude CLI 呼び出し

---

## 9. RSSフィード

### 9.1 概要
Claude Code の変更履歴をRSS 2.0形式で配信。新バージョンのリリースを購読可能。

### 9.2 フィード仕様

| 項目 | 内容 |
|------|------|
| 形式 | RSS 2.0 |
| URL | /ccclog/rss.xml |
| 言語 | 日本語/英語バイリンガル |
| 粒度 | バージョン単位 |
| 件数 | 最新50件 |

### 9.3 アイテム構造

| フィールド | 内容 |
|-----------|------|
| title | "Claude Code v{version}" |
| link | /{year}/#v{version} |
| pubDate | リリース日（JST） |
| description | 変更内容テーブル（日本語/英語列） |
| guid | linkと同じ（パーマリンク） |

### 9.4 実装
- Astro公式 `@astrojs/rss` パッケージを使用
- ビルド時に静的XMLファイルを生成
- `src/pages/rss.xml.ts` でエンドポイントを定義

---

## 10. 変更履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2026-01-31 | 2.2.0 | 検索時のcode表示維持、月内ソート、Markdownエスケープ、年別ページ動的化 |
| 2026-01-31 | 2.1.3 | セキュリティ要件を追加（XSS対策、コマンドインジェクション対策） |
| 2026-01-30 | 2.1.2 | 翻訳モデルを Claude Sonnet に明示的に指定（品質向上） |
| 2026-01-30 | 2.1.1 | ソースデータを `content/` ディレクトリに移動 |
| 2026-01-30 | 2.1.0 | 「（翻訳待ち）」エントリの再翻訳機能を追加 |
| 2026-01-30 | 2.0.0 | 新バージョン検出時に Claude Code CLI で自動翻訳する機能を追加 |
| 2026-01-30 | 1.4.0 | 新バージョン自動検出機能を追加（npm レジストリから未記載バージョンを検出し CHANGELOG に自動追記） |
| 2026-01-30 | 1.3.1 | フッターXアイコン位置変更、bugfixes分類対応 |
| 2026-01-29 | 1.3.0 | エントリタイプ分類改善、GitHubタグ取得追加、デプロイスケジュール変更、フッター改善 |
| 2026-01-29 | 1.2.0 | npm レジストリからのリリース日取得に変更（最も正確な公開日） |
| 2026-01-29 | 1.1.0 | 複数年対応を追加（2025年ページ、年切り替えナビゲーション） |
| 2026-01-29 | 1.0.0 | 初版作成 |
