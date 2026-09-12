alter table bookings
add column if not exists voucher_code text;

alter table bookings
add column if not exists voucher_discount_percentage integer;

alter table bookings
add column if not exists base_amount_pence integer;

alter table bookings
add column if not exists discount_amount_pence integer;

alter table bookings
add column if not exists final_amount_pence integer;

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
