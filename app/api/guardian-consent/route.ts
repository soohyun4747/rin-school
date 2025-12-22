import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = getSupabaseServiceRoleClient();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const token = searchParams.get("token");

  if (!userId || !token) {
    return NextResponse.redirect("/guardian-consent/error?reason=missing");
  }

  const { data: consent, error: selectError } = await supabase
    .from("user_consents")
    .select("guardian_status")
    .eq("user_id", userId)
    .eq("guardian_token", token)
    .single();

  if (selectError || !consent) {
    return NextResponse.redirect("/guardian-consent/error?reason=invalid");
  }

  if (consent.guardian_status === "confirmed") {
    return NextResponse.redirect("/guardian-consent/already-confirmed");
  }

  const { error: updateError } = await supabase
    .from("user_consents")
    .update({ guardian_status: "confirmed", guardian_confirmed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("guardian_token", token);

  if (updateError) {
    return NextResponse.redirect("/guardian-consent/error?reason=update_failed");
  }

  return NextResponse.redirect("/guardian-consent/success");
}
