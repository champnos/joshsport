import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "super-secret-service-key";

// Admin client for backend operations (reads/writes without RLS restrictions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
