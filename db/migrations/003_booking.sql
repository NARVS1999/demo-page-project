-- 003_booking.sql — Phase 2 booking schema (idempotent; applied by npm run seed)
-- services/slots/bookings + booking_id link on mock_emails/mock_sms.
-- Sequence: services → slots → bookings → status CHECK pair → indexes →
-- mock_* ALTERs (RESEARCH Pattern 1).
-- Every statement ends with ';' + newline (the seed runner splits on ";\n").

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  duration_min integer NOT NULL CHECK (duration_min > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  booked_at timestamptz,              -- NULL = available; set by the atomic claim
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slots_service_date_time_key UNIQUE (service_id, slot_date, slot_time)
);
CREATE INDEX IF NOT EXISTS slots_calendar_idx
  ON slots (service_id, slot_date) WHERE booked_at IS NULL;

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  price_cents integer NOT NULL,        -- snapshot at booking time
  deposit_payment_id uuid REFERENCES mock_payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 1 lesson: ADD CONSTRAINT has no IF NOT EXISTS → DROP-then-ADD pair.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- Belt-and-braces (BOOK-04): one ACTIVE booking per slot, enforced by the DB.
-- A cancelled booking frees the slot for a new active booking (partial-index
-- predicate) — the atomic conditional UPDATE is the primary claim guard.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx
  ON bookings (slot_id) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status, created_at DESC);

-- Link notices to bookings (confirmation page + seed realism). Additive — the
-- existing mock_* readers (admin/emails, admin/sms) ignore the new column.
ALTER TABLE mock_emails ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE mock_sms ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS mock_emails_booking_idx ON mock_emails (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mock_sms_booking_idx ON mock_sms (booking_id) WHERE booking_id IS NOT NULL;
