# 設計書 — 家計管理アプリ

**バージョン：** 1.0
**最終更新：** 2026-04-19

---

## 1. 技術スタック

| 役割 | ツール | バージョン |
|------|--------|---------|
| フレームワーク | Next.js (App Router) | 16.x |
| スタイリング | Tailwind CSS | v4 |
| グラフ | Recharts | 3.x |
| DB・バックエンド | Supabase (PostgreSQL) | - |
| ホスティング | Vercel | - |
| 言語 | TypeScript | 5.x |

Route Handler（API エンドポイント）は使用していません。
すべてのデータ操作はクライアントから Supabase JS クライアントを直接呼び出します。

---

## 2. データモデル

### expenses テーブル（支出・立替を統合）

```sql
expenses (
  id             uuid PRIMARY KEY,
  user_id        uuid REFERENCES users(id),      -- 支払者
  category_id    uuid REFERENCES categories(id),
  amount         int  NOT NULL,                  -- 円（整数）
  payment_method text NOT NULL,                  -- '現金'|'PayPay'|'カード'
  place          text,                           -- 場所（予測補完用）
  date           date NOT NULL,
  note           text,                           -- メモ・立替の場合は内容
  advance_status text,                           -- NULL|'unsettled'|'settled'
  settled_at     timestamptz,                    -- 精算日時
  created_at     timestamptz DEFAULT now()
)
```

**advance_status の意味：**

| 値 | 意味 |
|----|------|
| `NULL` | 通常の支出 |
| `'unsettled'` | 未精算の立替 |
| `'settled'` | 精算済の立替 |

立替の精算は `advance_status` を `'unsettled'` → `'settled'` に UPDATE するだけです。
新しいレコードは作成しません（二重登録なし）。

### その他のテーブル

```sql
users (id, name, created_at)
categories (id, name, sort_order, created_at)
budgets (id, category_id, amount, month, created_at)
contributions (id, user_id, amount, month, created_at)  -- 将来拡張用・現在未使用
```

---

## 3. 画面構成

```
起動
 └─ ユーザー選択画面（中村 / 寺本）
       └─ ホーム (/home)
             ├─ 今月残高カード（マイナス時は赤表示）
             ├─ 先月までの資産合計
             ├─ 未精算立替アラート
             ├─ [支出入力] [立替入力] ボタン
             └─ カテゴリ別予算進捗バー

ボトムナビ
 ├─ ホーム    /home
 ├─ 一覧     /expenses        （通常支出＋精算済立替）
 ├─ 立替     /advances        （未精算タブ / 精算済タブ）
 ├─ 集計     /summary
 ├─ グラフ   /graph
 └─ 設定     /settings
```

---

## 4. 主要ロジック

### 残高計算（ホーム・集計）

```
今月の残高 = 今月の予算合計
           - 今月の通常支出（advance_status IS NULL）
           - 今月の精算済立替（advance_status = 'settled'）
           - 今月の未精算立替（advance_status = 'unsettled'）
```

### 先月までの資産合計（キャリーオーバー）

```
先月以前の資産合計 = Σ(過去の月次予算) - Σ(過去の全支出・立替)
```

expenses テーブルの単一クエリで完結します（advance_status を問わず全件）。

### 支出一覧のフィルタ

| 画面 | 表示対象 |
|------|---------|
| 支出一覧 `/expenses` | `advance_status IS NULL` または `'settled'` |
| 立替一覧 `/advances` 未精算タブ | `advance_status = 'unsettled'` |
| 立替一覧 `/advances` 精算済タブ | `advance_status = 'settled'`（直近50件）|
| グラフ `/graph` | 全件（advance_status 問わず） |

---

## 5. ファイル構成

```
src/
├── app/
│   ├── layout.tsx              ルートレイアウト（PWA メタタグ・フォント）
│   ├── page.tsx                ユーザー選択画面
│   ├── icon.tsx                ファビコン生成（🏦 32×32）
│   ├── apple-icon.tsx          Apple タッチアイコン生成（🏦 180×180）
│   ├── globals.css
│   └── (app)/                  認証済みレイアウトグループ
│       ├── layout.tsx          ボトムナビ・未ログイン時リダイレクト
│       ├── home/page.tsx
│       ├── expenses/
│       │   ├── page.tsx        支出一覧
│       │   ├── new/page.tsx    支出入力
│       │   └── [id]/page.tsx   支出編集・削除
│       ├── advances/
│       │   ├── page.tsx        立替一覧（タブ切替）
│       │   ├── new/page.tsx    立替入力
│       │   └── [id]/page.tsx   立替編集・削除
│       ├── summary/page.tsx    集計
│       ├── graph/page.tsx      グラフ
│       └── settings/page.tsx  設定
├── components/
│   ├── bottom-nav.tsx
│   ├── budget-bar.tsx
│   ├── amount-input.tsx
│   └── ui/                     shadcn/ui コンポーネント
├── contexts/
│   └── user-context.tsx        ログインユーザー（localStorage 永続化）
├── lib/
│   ├── supabase.ts
│   └── utils.ts
└── types/
    └── index.ts                User / Category / Expense / Budget 型定義
```

---

## 6. PWA 対応

- `public/manifest.json` — `display: "standalone"` で Safari のブラウザ UI を非表示
- `apple-mobile-web-app-capable: yes` — iOS ホーム画面追加時にアプリ風動作
- iOS 16.4+ で最適動作。14 系は一部挙動の差異あり（OS レベルの制限）

---

## 7. 開発・デプロイ手順

```bash
# ローカル起動
npm install
npm run dev

# ビルド確認
npm run build

# Vercel デプロイ
# → main ブランチ push で自動デプロイ
# → 環境変数は Vercel 管理画面で設定
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
```
