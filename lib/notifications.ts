import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type TypedClient = SupabaseClient<Database>;

export async function getAdminNotificationEmails(client: TypedClient) {
  const { data, error } = await client
    .from("admin_notification_emails")
    .select("email")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin_notification_emails] failed to load", error);
    return [];
  }

  return (data ?? []).map((row) => row.email).filter(Boolean);
}
