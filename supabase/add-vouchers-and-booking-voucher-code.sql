alter table bookings
add column if not exists voucher_code text;

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
