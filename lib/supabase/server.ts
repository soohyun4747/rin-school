import { cookies } from "next/headers";

type ServerFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type ServerSupabaseClient = {
  fetch: ServerFetch;
};

export function createServerSupabaseClient(): ServerSupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const cookieStore = cookies();

  const fetchWithAuth: ServerFetch = async (path, init) => {
    const accessToken = cookieStore.get("sb-access-token")?.value;
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${accessToken ?? serviceKey}`,
      ...init?.headers,
    } as Record<string, string>;

    return fetch(`${url}${path}`, { ...init, headers });
  };

  return {
    fetch: fetchWithAuth,
  };
}

export async function serverRestQuery<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const client = createServerSupabaseClient();
  const response = await client.fetch(path, {
    headers: { Accept: "application/json" },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase server request failed: ${response.status} ${message}`);
  }

  return (await response.json()) as T;
}
