"use client";

type BrowserFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type BrowserSupabaseClient = {
  fetch: BrowserFetch;
};

export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing public Supabase env vars");
  }

  const fetchWithAuth: BrowserFetch = async (path, init) => {
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      ...init?.headers,
    } as Record<string, string>;

    return fetch(`${url}${path}`, { ...init, headers });
  };

  return { fetch: fetchWithAuth };
}
