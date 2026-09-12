-- Run this in the Supabase SQL editor to set up the database

create table if not exists treatments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  durations jsonb not null default '[]'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  -- Stored as text to support both static slugs and future Supabase UUIDs
  treatment_id text,
  treatment_name text,
  duration_mins integer,
  date date not null,
  start_time text not null,
  client_name text,
  client_dob text,
  client_phone text,
  client_address text,
  client_postcode text,
  emergency_name text,
  emergency_relationship text,
  emergency_phone text,
  medical_conditions jsonb default '[]'::jsonb,
  medical_notes text,
  injury_recent boolean default false,
  injury_recent_notes text,
  injury_previous boolean default false,
  injury_previous_notes text,
  voucher_code text,
  voucher_discount_percentage integer,
  base_amount_pence integer,
  discount_amount_pence integer,
  final_amount_pence integer,
  payment_intent_id text unique,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percentage integer not null check (discount_percentage >= 0 and discount_percentage <= 100),
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  created_at timestamptz not null default now()
);

create or replace function increment_voucher_usage(voucher_code_input text)
returns boolean
language plpgsql
as $$
declare
  updated_rows integer;
begin
  update vouchers
  set uses_count = uses_count + 1
  where code = voucher_code_input
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses);

  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

create or replace function decrement_voucher_usage(voucher_code_input text)
returns void
language sql
as $$
  update vouchers
  set uses_count = greatest(uses_count - 1, 0)
  where code = voucher_code_input;
$$;

create table if not exists working_dates (
  date text primary key,
  available boolean not null default false,
  start_time text,
  end_time text,
  blocked_slots jsonb not null default '[]'::jsonb,
  booked_slots jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function seed_working_dates_rolling(months_ahead integer default 12)
returns void
language plpgsql
as $$
declare
  start_date date := current_date;
  end_date date := (current_date + make_interval(months => months_ahead) - interval '1 day')::date;
begin
  insert into working_dates (date, available)
  select to_char(day_value::date, 'YYYY-MM-DD'), false
  from generate_series(start_date, end_date, interval '1 day') as day_value
  on conflict (date) do nothing;
end;
$$;

select seed_working_dates_rolling();

insert into treatments (name, description, durations, active) values
(
  'Sports Massage',
  'Designed to aid performance, prevent injury and support recovery through movement and deep tissue techniques. Suitable before or after exercise.',
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
  'Pre-Event Treatment',
  'Activating and stimulating massage to prime your muscles for competition. Increases blood flow, reduces muscle tension and sharpens neuromuscular readiness.',
  '[{"mins": 30, "price": 25}]',
  true
),
(
  'Post-Event Recovery',
  'Gentle yet effective techniques to flush out waste products, reduce DOMS and speed up recovery after competition or intense training.',
  '[{"mins": 30, "price": 25}]',
  true
);
