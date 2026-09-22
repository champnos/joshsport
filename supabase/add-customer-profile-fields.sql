alter table customers
add column if not exists phone text,
add column if not exists address text,
add column if not exists postcode text,
add column if not exists date_of_birth text,
add column if not exists medical_conditions jsonb not null default '[]'::jsonb,
add column if not exists medical_notes text,
add column if not exists injury_recent boolean not null default false,
add column if not exists injury_recent_notes text,
add column if not exists injury_previous boolean not null default false,
add column if not exists injury_previous_notes text,
add column if not exists additional_information text;
