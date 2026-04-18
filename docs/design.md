# 設計書 — 家計管理アプリ

**バージョン：** 0.1
**作成日：** 2026-04-18

---

## 1. 技術スタック

| 役割 | ツール | バージョン |
|------|--------|---------|
| フレームワーク | Next.js (App Router) | 15.x |
| UI | Tailwind CSS + shadcn/ui | - |
| グラフ | Recharts | 2.x |
| DB・バックエンド | Supabase (PostgreSQL) | - |
| ホスティング | Vercel | - |
| 言語 | TypeScript | 5.x |

---

## 2. 詳細データモデル

```sql
-- ユーザー
users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,          -- '中村' | '寺本'
  created_at  timestamptz DEFAULT now()
)

-- カテゴリ（追加可能）
categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,          -- '食費' など
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
)

-- 支出
expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES users(id),
  category_id    uuid REFERENCES categories(id),
  amount         int  NOT NULL,              -- 円（整数）
  payment_method text NOT NULL,             -- '現金'|'PayPay'|'カード'
  place          text,                       -- 場所（予測補完用）
  date           date NOT NULL,
  note           text,                       -- 任意メモ
  created_at     timestamptz DEFAULT now()
)

-- 月次拠出（毎月25日の15万）
contributions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id),
  amount      int  NOT NULL DEFAULT 150000,
  month       text NOT NULL,                -- 'YYYY-MM'
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
)

-- 月次予算
budgets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id),
  amount      int  NOT NULL,
  month       text NOT NULL,                -- 'YYYY-MM'
  created_at  timestamptz DEFAULT now(),
  UNIQUE(category_id, month)
)

-- 立替
advances (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id     uuid REFERENCES users(id),   -- 立替た人
  amount       int  NOT NULL,
  description  text NOT NULL,               -- 内容
  date         date NOT NULL,
  settled      bool NOT NULL DEFAULT false,
  settled_at   timestamptz,
  created_at   timestamptz DEFAULT now()
)
```

### 補足

- 金額はすべて**円の整数**で統一（小数なし）
- `place` は別テーブルにせず `expenses.place` の DISTINCT で予測候補を生成
- `month` は `'YYYY-MM'` 文字列（例：`'2026-04'`）で統一

---

## 3. 画面フロー

```
起動
 └─ ユーザー選択画面（中村 / 寺本）
       └─ ホーム画面
             ├─ [支出入力] ボタン → 支出入力フォーム → 完了 → ホーム
             ├─ [立替入力] ボタン → 立替入力フォーム → 完了 → ホーム
             ├─ [一覧] タブ
             │     └─ 支出一覧（フィルタ：月・カテゴリ・支払方法）
             ├─ [集計] タブ
             │     ├─ 今月残高・立替残高
             │     ├─ カテゴリ別 予算 vs 実績
             │     ├─ 月平均（全体・カテゴリ別）
             │     └─ 立替一覧 → 精算ボタン
             ├─ [グラフ] タブ
             │     ├─ 月別推移（折れ線）
             │     └─ カテゴリ内訳（円グラフ）
             └─ [設定] タブ
                   ├─ カテゴリ管理（追加・並び替え）
                   ├─ 予算設定
                   └─ ユーザー切替
```

### ホーム画面レイアウト（参考）

```
┌─────────────────────────────┐
│ こんにちは、中村さん    4月  │
├─────────────────────────────┤
│ 今月残高         ¥ 212,300  │
│ 支出合計         ¥  87,700  │
├─────────────────────────────┤
│ ⚠ 立替あり  寺本 → 中村 ¥2,500 │
├─────────────────────────────┤
│ カテゴリ別進捗               │
│ 食費    ████░░  ¥32,000/¥50,000 │
│ 交際費  ██████  ¥18,000/¥15,000 ⚠超過 │
├─────────────────────────────┤
│ [+ 支出を入力]  [立替を入力] │
└─────────────────────────────┘
```

---

## 4. API設計（Next.js Route Handlers）

Supabase クライアントを直接呼ぶため REST API は最小限。集計系のみ Route Handler で実装。

```
# 支出
GET    /api/expenses?month=YYYY-MM&category=&payment=
POST   /api/expenses
DELETE /api/expenses/:id

# 場所の予測候補（過去の入力から取得）
GET    /api/places?q=検索文字列

# 集計
GET    /api/summary?month=YYYY-MM
  → { total, balance, byCategory: [{id, name, budget, actual, avg}], overallAvg }

# 立替
GET    /api/advances?settled=false
POST   /api/advances
PATCH  /api/advances/:id/settle

# 予算
GET    /api/budgets?month=YYYY-MM
POST   /api/budgets          -- upsert

# 拠出
GET    /api/contributions?month=YYYY-MM
POST   /api/contributions
```

---

## 5. 実装フェーズ

| フェーズ | 内容 |
|---------|------|
| Phase 1 | 環境構築・Supabase DB作成・ユーザー選択画面 |
| Phase 2 | 支出入力フォーム・一覧表示 |
| Phase 3 | 集計・残高・月平均 |
| Phase 4 | 予算設定・予算 vs 実績表示 |
| Phase 5 | 立替機能 |
| Phase 6 | グラフ可視化 |
| Phase 7 | 場所予測補完・細かいUX改善 |

---

## 6. 開発環境セットアップ手順

```bash
# 1. Node.js インストール（未インストールの場合）
#    https://nodejs.org から LTS版をダウンロード

# 2. プロジェクト作成
npx create-next-app@latest home-financial-manager \
  --typescript --tailwind --app --src-dir

cd home-financial-manager

# 3. 依存パッケージ追加
npm install @supabase/supabase-js recharts
npx shadcn@latest init

# 4. 環境変数設定（Supabase管理画面から取得）
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx

# 5. Vercel デプロイ
#    https://vercel.com でGitHubと連携 → リポジトリをインポート
#    環境変数を Vercel 管理画面に同じ内容で設定
```
