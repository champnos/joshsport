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
  customer_id uuid,
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
  additional_information text,
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
  status text default 'pending_payment',
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  password_hash text not null,
  email_verified_at timestamptz,
  is_admin boolean not null default false,
  phone text,
  address text,
  postcode text,
  date_of_birth text,
  medical_conditions jsonb not null default '[]'::jsonb,
  medical_notes text,
  injury_recent boolean not null default false,
  injury_recent_notes text,
  injury_previous boolean not null default false,
  injury_previous_notes text,
  additional_information text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists terms_and_conditions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
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

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percentage integer not null check (discount_percentage >= 0),
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

create unique index if not exists bookings_pending_payment_hold_unique_idx
on bookings (
  regexp_replace(coalesce(client_phone, ''), '\D', '', 'g'),
  lower(btrim(coalesce(client_email, ''))),
  treatment_id,
  duration_mins,
  date,
  start_time
)
where status = 'pending_payment';

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

insert into terms_and_conditions (id, title, content)
values (
  '11111111-1111-1111-1111-111111111111',
  $title$MMT Massage Terms & Conditions$title$,
  $content$Please read these terms carefully before confirming your appointment. They are designed to protect both the client and therapist to support a safe and professional mobile massage service.

Last Updated
- 16/09/2026

Client Responsibilities
- You must be 18 years or over to book and receive treatment.
- You must provide accurate and up-to-date personal, health and booking information, including your address and any relevant parking or access information. Please notify MMT at contact@maggsymassagetherapy.com as soon as possible if any booking information changes.
- You must provide a clean, safe, and sufficiently spacious area for the massage table and treatment.
- You must ensure clear and safe access to the property and treatment area.
- You must be available and ready for your appointment at the agreed time. If you are late, your treatment time may be reduced where necessary to accommodate subsequent appointments, with the full appointment fee remaining payable.
- If you are not present or available at the agreed time, the therapist will attempt to contact you. If you cannot be reached within a reasonable period, the appointment may be treated as a no-show, and the full appointment fee may remain payable.

Health Disclosure
- You must disclose any relevant medical conditions, injuries, allergies, pregnancy, recent surgery, medication, or other health concerns before treatment.
- You must inform the therapist of any relevant changes to your health before your appointment.
- The therapist may adapt, postpone, or refuse treatment where they consider it inappropriate or unsafe to proceed.
- Where your needs fall outside the therapist's scope of practice, training or professional competence, you may be advised to seek assessment or treatment from an appropriate sports or healthcare professional.

Booking Confirmation & Address Changes
- Treatment will take place at the address provided during booking.
- You must notify Maggsy MT as soon as possible if your address, access arrangements or other details affecting the appointment change.
- Failure to provide accurate or updated information may result in delays, additional charges where applicable, rescheduling, or cancellation.

Treatment & Results
- Sports massage is intended to support general wellbeing, recovery, mobility, and physical performance. It is not a substitute for medical diagnosis, medical treatment, or other healthcare services.
- Individual responses to treatment vary, and no specific outcome or result is guaranteed.

Therapist Responsibilities
- The therapist will act professionally, maintain appropriate hygiene standards and provide treatment within the limits of their training, qualifications, professional competence, and insurance.
- Client information will be handled confidentially and in accordance with applicable data protection requirements, except where disclosure is required by law or necessary to protect health and safety.
- The therapist may refuse or end treatment where they consider it unsafe, inappropriate or outside their professional scope, or where inappropriate behavior occurs.

Health & Safety
- Treatment will not be provided where the therapist considers it unsafe or inappropriate to proceed, including circumstances involving contagious illness, intoxication, or relevant contraindications.
- Clients must ensure that pets, children, and other household activities or disruptions are appropriately managed during the appointment to allow treatment to be carried out safely and professionally.

Payment Terms
- Payment is required in full at the time of booking, unless an alternative arrangement has been agreed in writing with Maggsy MT.
- The price displayed at the time of booking applies to the treatment selected and confirmed at payment.
- Any additional treatment time or services requested during an appointment will be agreed with the client before being provided and may incur an additional charge.

Cancellations and Changes
- Please provide at least 24 hours' notice to cancel or reschedule an appointment.
- Appointments cancelled or rescheduled with at least 24 hours' notice may be rescheduled or refunded, subject to the terms of the booking.
- Cancellations or rescheduling requests made with less than 24 hours' notice may be subject to a cancellation charge of up to the full booking fee.
- Missed appointments or no shows may be charged up to the full booking fee.
- Cancellation charges and refunds will be applied fairly and proportionately and in accordance with applicable consumer law.
- If Maggsy MT needs to be canceled due to illness, emergency, unsafe travel conditions or circumstances beyond reasonable control, an alternative appointment or full refund will be offered.

Privacy & Record Keeping
- Personal information, including relevant health information, will be collected and stored within applicable data protection requirements.
- Treatment and booking records will be retained for up to 7 years, unless a longer retention period is required by law, professional requirements, or insurance obligations. Records will be stored securely in a password-protected system with access restricted to the therapist.

Complaints
- If you have a concern or complaint about your treatment or service, please contact Maggsy MT as soon as possible using the contact details provided on the website.
- Complaints will be reviewed fairly and reasonably, with the aim of resolving them promptly.
- Where necessary, the therapist may request further information to investigate the complaint.

Client Conduct
- Clients must behave respectfully and professionally towards the therapist.
- Abusive, threatening, discriminatory, sexual, or otherwise inappropriate behavior will not be tolerated.
- The therapist reserves the right to end treatment immediately if inappropriate behavior occurs. The appointment may be charged in full.

Statutory Rights
- Nothing in these Terms & Conditions affects your statutory rights under applicable UK consumer law.$content$
)
on conflict (id) do nothing;
