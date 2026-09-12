create unique index if not exists bookings_pending_payment_hold_unique_idx
on bookings (client_phone, coalesce(client_email, ''), treatment_id, duration_mins, date, start_time)
where status = 'pending_payment';
