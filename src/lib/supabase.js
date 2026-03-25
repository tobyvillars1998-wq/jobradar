import { createClient } from '@supabase/supabase-js'

// Browser client — uses anon key, respects row-level security
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Server client — uses service role key, bypasses row-level security
// Only use in server-side API routes (never exposed to the browser)
let _serviceClient
export function getServiceClient() {
  return _serviceClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
