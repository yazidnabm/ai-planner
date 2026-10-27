import { createClient } from '@supabase/supabase-js';
import { loadConfig } from './config.js';

const config = loadConfig();

// Admin client (server-only). Only used for operations that already
// passed JWT verification + ownership checks. Never exposed to the client.
export const admin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// User-scoped client: built per-request from the user's access token.
// Supabase enforces RLS automatically on this client.
export function clientForUser(accessToken) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
