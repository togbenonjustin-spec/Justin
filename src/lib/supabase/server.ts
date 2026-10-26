import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-expect-error Node 20 WebSocket polyfill for @supabase/realtime-js
  globalThis.WebSocket = WebSocket;
}

/**
 * Client Supabase serveur (Route Handlers / Server Actions / Cron)
 * Utilise SUPABASE_SERVICE_ROLE_KEY strictement côté serveur.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !serviceKey ||
    url.includes("your-project-ref") ||
    serviceKey.includes("your-service-role-key")
  ) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Client Supabase authentifié avec le JWT d'un utilisateur spécifique (respecte le RLS !)
 */
export function createSupabaseUserClient(accessToken?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("your-project-ref")) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
