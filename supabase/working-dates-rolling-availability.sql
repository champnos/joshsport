ALTER TABLE working_dates
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booked_slots jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE working_dates
  DROP COLUMN IF EXISTS is_off,
  ALTER COLUMN blocked_slots SET DEFAULT '[]'::jsonb,
  ALTER COLUMN booked_slots SET DEFAULT '[]'::jsonb;

UPDATE working_dates
SET
  available = COALESCE(available, false),
  blocked_slots = COALESCE(blocked_slots, '[]'::jsonb),
  booked_slots = COALESCE(booked_slots, '[]'::jsonb);

CREATE OR REPLACE FUNCTION seed_working_dates_rolling(months_ahead integer DEFAULT 12)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  start_date date := current_date;
  end_date date := (current_date + make_interval(months => months_ahead) - interval '1 day')::date;
BEGIN
  INSERT INTO working_dates (date, available)
  SELECT to_char(day_value::date, 'YYYY-MM-DD'), false
  FROM generate_series(start_date, end_date, interval '1 day') AS day_value
  ON CONFLICT (date) DO NOTHING;
END;
$$;

SELECT seed_working_dates_rolling();
