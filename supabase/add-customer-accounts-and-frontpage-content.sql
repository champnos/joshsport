alter table bookings
add column if not exists customer_id uuid,
add column if not exists additional_information text;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  password_hash text not null,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists customer_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_customer_id_fkey'
  ) then
    alter table bookings
      add constraint bookings_customer_id_fkey
      foreign key (customer_id) references customers(id) on delete set null;
  end if;
end;
$$;

create index if not exists bookings_customer_id_idx on bookings(customer_id);
create index if not exists customer_email_verification_tokens_customer_id_idx on customer_email_verification_tokens(customer_id);
create index if not exists customer_password_reset_tokens_customer_id_idx on customer_password_reset_tokens(customer_id);

create or replace function set_customers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at
before update on customers
for each row
execute function set_customers_updated_at();
