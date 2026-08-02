-- 004_ecommerce.sql — Phase 3 Northstar Coffee schema (idempotent; applied by npm run seed)
-- Isolated shop taxonomy, products, user carts, order snapshots, and the
-- additive order link on mock_emails. Every statement ends with ';' + newline
-- so the seed runner can safely split this migration when required.

CREATE TABLE IF NOT EXISTS shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES shop_categories(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  image_url text,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  inventory integer NOT NULL DEFAULT 0 CHECK (inventory >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id, name);
CREATE INDEX IF NOT EXISTS products_price_idx ON products (price_cents);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS cart_items_user_idx ON cart_items (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES mock_payments(id) ON DELETE RESTRICT,
  total_cents integer NOT NULL CHECK (total_cents > 0),
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('paid', 'preparing', 'ready', 'cancelled'));

CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  line_total_cents integer NOT NULL CHECK (line_total_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

ALTER TABLE mock_emails ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS mock_emails_order_idx
  ON mock_emails (order_id) WHERE order_id IS NOT NULL;
