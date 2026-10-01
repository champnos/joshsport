-- Guest checkout: bookings no longer require a logged-in customer account.
-- Guest contact details are stored directly on the booking row (client_name, client_email, client_phone, ...),
-- and customer_id stays NULL until the guest optionally creates and verifies an account with the same email.
-- Safe to run multiple times.

alter table bookings alter column customer_id drop not null;

create index if not exists bookings_client_email_idx on bookings (client_email);
