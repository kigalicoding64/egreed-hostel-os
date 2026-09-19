/**
 * Server-only Supabase helpers used by the AI chat routes.
 * Builds a request-scoped client that acts as the signed-in user (RLS applies).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export interface AuthedContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  email: string | null;
}

/** Validates the request bearer token and returns a user-scoped Supabase client. */
export async function requireUser(request: Request): Promise<AuthedContext | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || !sub) return null;

  return {
    supabase,
    userId: sub as string,
    email: (data.claims["email"] as string | undefined) ?? null,
  };
}

/** Rounds numbers so the model receives compact, readable figures. */
export function money(value: number | null | undefined): number {
  return Math.round(Number(value ?? 0));
}
