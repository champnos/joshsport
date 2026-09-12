alter table bookings
add column if not exists payment_intent_id text;

create unique index if not exists bookings_payment_intent_id_unique_idx
on bookings (payment_intent_id)
where payment_intent_id is not null;
