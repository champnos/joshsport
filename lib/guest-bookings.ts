import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCustomerEmail } from "@/lib/customer-auth";

const PROFILE_SOURCE_STATUSES = ["confirmed", "completed"];

/**
 * Attaches earlier guest bookings made with the same (now verified) email address to the customer
 * account, and prefills an empty customer profile from their most recent paid booking so they can
 * book faster next time. Only call this once the customer has proven ownership of the email address.
 */
export async function linkGuestBookingsToCustomer(customerId: string, email: string) {
  const normalizedEmail = normalizeCustomerEmail(email);
  if (!customerId || !normalizedEmail) return;

  const { error: linkError } = await supabaseAdmin
    .from("bookings")
    .update({ customer_id: customerId })
    .is("customer_id", null)
    .eq("client_email", normalizedEmail);
  if (linkError) throw linkError;

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("full_name, phone, address, postcode, date_of_birth")
    .eq("id", customerId)
    .single();
  if (customerError || !customer) throw customerError ?? new Error("Customer not found.");

  const hasProfileDetails = Boolean(customer.phone || customer.address || customer.postcode || customer.date_of_birth);
  if (hasProfileDetails) return;

  const { data: latestBooking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select(
      "client_name, client_dob, client_phone, client_address, client_postcode, medical_conditions, medical_notes, injury_recent, injury_recent_notes, injury_previous, injury_previous_notes, additional_information",
    )
    .eq("customer_id", customerId)
    .in("status", PROFILE_SOURCE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!latestBooking) return;

  const { error: profileError } = await supabaseAdmin
    .from("customers")
    .update({
      full_name: customer.full_name || latestBooking.client_name || null,
      date_of_birth: latestBooking.client_dob || null,
      phone: latestBooking.client_phone || null,
      address: latestBooking.client_address || null,
      postcode: latestBooking.client_postcode || null,
      medical_conditions: Array.isArray(latestBooking.medical_conditions) ? latestBooking.medical_conditions : [],
      medical_notes: latestBooking.medical_notes || null,
      injury_recent: Boolean(latestBooking.injury_recent),
      injury_recent_notes: latestBooking.injury_recent_notes || null,
      injury_previous: Boolean(latestBooking.injury_previous),
      injury_previous_notes: latestBooking.injury_previous_notes || null,
      additional_information: latestBooking.additional_information || null,
    })
    .eq("id", customerId);
  if (profileError) throw profileError;
}
