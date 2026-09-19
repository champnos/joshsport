alter table vouchers
drop constraint if exists vouchers_discount_percentage_check;

alter table vouchers
add constraint vouchers_discount_percentage_check
check (discount_percentage >= 0);
