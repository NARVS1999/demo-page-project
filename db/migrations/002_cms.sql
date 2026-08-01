-- 002_cms.sql — Phase 1 CMS schema (idempotent; applied by npm run seed)
-- Categories/tags/post_tags taxonomy + posts evolution: published boolean →
-- status (text + CHECK), slug, category_id, cover_image, published_at.
-- Sequence: taxonomy tables → status column → backfill from published →
-- drop published → remaining columns → slug backfill → indexes.
-- Every statement ends with ';' + newline (the seed runner splits on ";\n").

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;

ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'published'));

ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image text;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Backfill (idempotent by its WHERE clause)
UPDATE posts SET status = 'published' WHERE published = true AND status = 'draft';

ALTER TABLE posts DROP COLUMN IF EXISTS published;

-- Backfill slugs for pre-CMS rows, then enforce uniqueness. ADD CONSTRAINT has
-- no IF NOT EXISTS; a unique index is ledger-safe and produces the same 23505
-- error code on violation.
UPDATE posts SET slug = btrim(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), '-') WHERE slug IS NULL;

-- Pre-CMS posts can share a title → identical backfilled slugs would make the
-- unique index below throw 23505 and abort the whole migration. Append a short
-- id fragment to the LATER rows of each duplicate group (uuid comparison is
-- stable), keeping the earliest row's slug. Self-guarding: no-op when no
-- duplicates exist, so the statement stays safe to re-run.
UPDATE posts p SET slug = p.slug || '-' || substr(p.id::text, 1, 8)
WHERE EXISTS (
  SELECT 1 FROM posts p2
  WHERE p2.slug = p.slug AND p2.id < p.id
);

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug);

CREATE INDEX IF NOT EXISTS posts_category_id_idx ON posts (category_id);

CREATE INDEX IF NOT EXISTS posts_published_idx ON posts (published_at DESC) WHERE status = 'published';
