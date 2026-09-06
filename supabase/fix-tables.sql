-- Fix: Recreate treatments table with proper schema and add back FK constraint

-- Drop old constraints if they exist
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_treatment_id_fkey;

-- Create treatments table with correct schema
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  durations jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Disable RLS for public read
ALTER TABLE treatments DISABLE ROW LEVEL SECURITY;

-- Clear old data and insert new treatments
DELETE FROM treatments;
INSERT INTO treatments (name, description, durations, active) VALUES
(
  'Sports Massage',
  'Designed to aid performance, prevent injury and support recovery through movement and deep tissue techniques.',
  '[{"mins": 30, "price": 25}, {"mins": 45, "price": 35}, {"mins": 60, "price": 45}]',
  true
),
(
  'Full Body Reset',
  'A full-length sports massage that targets all muscle groups for total body recovery and reset.',
  '[{"mins": 90, "price": 65}]',
  true
),
(
  'Deep Tissue Massage',
  'Deeper pressure to release chronic tension.',
  '[{"mins": 60, "price": 65}]',
  true
),
(
  'Mobile Home Visit',
  'Professional massage treatment in your home.',
  '[{"mins": 60, "price": 70}]',
  true
);

-- Recreate FK constraint
ALTER TABLE bookings 
ADD CONSTRAINT bookings_treatment_id_fkey 
FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL;

-- Enable RLS on bookings (so only admin can read)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policy: only allow reads if admin (we'll use a workaround via API auth)
-- For now, block all public access
CREATE POLICY "Block all public access" ON bookings
  FOR SELECT
  USING (false);
