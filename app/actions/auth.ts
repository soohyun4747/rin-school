"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";

export type PasswordUpdateState = { success?: boolean; error?: string };

export async function changePassword(prev: PasswordUpdateState, formData: FormData): Promise<PasswordUpdateState> {
  void prev;
  const { session, profile } = await requireSession();
  const currentPassword = String(formData.get("current_password") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();

  if (!currentPassword || !newPassword) {
    return { success: false, error: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "새 비밀번호가 일치하지 않습니다." };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const supabase = await getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: session?.user.email ?? profile.email,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("비밀번호 변경 실패", error);
    return { success: false, error: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { success: true };
}

export type DeleteAccountState = { error?: string };

export async function deleteAccount(prev: DeleteAccountState): Promise<DeleteAccountState> {
  void prev;
  const { profile } = await requireSession();

  try {
    const adminClient = getSupabaseServiceRoleClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(profile.id);
    if (deleteError) {
      console.error("계정 삭제 실패", deleteError);
      return { error: "계정을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요." };
    }
  } catch (error) {
    console.error("계정 삭제 클라이언트 생성 실패", error);
    return { error: "계정을 삭제하는 중 문제가 발생했습니다. 관리자에게 문의해주세요." };
  }

  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function logout() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
