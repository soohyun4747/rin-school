"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

type BrowserClientOptions = {
  persistAcrossBrowserRestart?: boolean;
};

export function getSupabaseBrowserClient(options?: BrowserClientOptions) {
  const persistAcrossBrowserRestart = options?.persistAcrossBrowserRestart ?? true;

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: persistAcrossBrowserRestart ? localStorage : sessionStorage,
      },
    }
  );
}
