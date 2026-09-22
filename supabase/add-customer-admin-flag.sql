alter table customers
add column if not exists is_admin boolean not null default false;

update customers
set is_admin = true
where lower(email) = lower('champnos@hotmail.com');
