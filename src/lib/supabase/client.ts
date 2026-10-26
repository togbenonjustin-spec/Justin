import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur — utilise UNIQUEMENT la clé publique anon.
 * Aucune clé service_role n'est jamais exposée côté client.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("your-project-ref")) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}
