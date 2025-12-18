import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Role = Tables<"profiles">["role"];

export async function getSessionAndProfile() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { session: null, profile: null } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, name, phone")
    .eq("id", session.user.id)
    .single();

  return { session, profile } as const;
}

export async function requireSession() {
  const { session, profile } = await getSessionAndProfile();

  if (!session || !profile) {
    redirect("/auth/login");
  }

  return { session, profile } as const;
}

export function requireRole(profileRole: Role, allowed: Role[]) {
  if (!allowed.includes(profileRole)) {
    redirect("/dashboard");
  }
}
