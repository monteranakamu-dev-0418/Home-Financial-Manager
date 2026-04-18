-- ユーザー
CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO users (name) VALUES ('中村'), ('寺本');

-- カテゴリ
CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  icon       text DEFAULT '📦',
  created_at timestamptz DEFAULT now()
);

INSERT INTO categories (name, sort_order, icon) VALUES
  ('家賃',   1, '🏠'),
  ('光熱費', 2, '💡'),
  ('水道代', 3, '🚿'),
  ('食費',   4, '🍽️'),
  ('交際費', 5, '🎉'),
  ('貯金',   6, '💴');

-- 支出（立替を含む）
-- advance_status:
--   NULL        = 通常の支出
--   'unsettled' = 未精算の立替
--   'settled'   = 精算済の立替
CREATE TABLE expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id),
  category_id    uuid NOT NULL REFERENCES categories(id),
  amount         int  NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('現金', 'PayPay', 'カード')),
  place          text,
  date           date NOT NULL,
  note           text,
  advance_status text CHECK (advance_status IN ('unsettled', 'settled')),
  settled_at     timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- 月次拠出（未使用・将来拡張用）
CREATE TABLE contributions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id),
  amount     int  NOT NULL DEFAULT 150000,
  month      text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

-- 月次予算
CREATE TABLE budgets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id),
  amount      int  NOT NULL CHECK (amount >= 0),
  month       text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(category_id, month)
);
