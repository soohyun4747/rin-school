"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function applyToCourse(courseId: string, slotsString: string) {
  const { session, profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  const slots = slotsString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [start, end] = s.split("|");
      return { start, end };
    });

  if (slots.length === 0) {
    throw new Error("최소 1개 이상의 시간을 선택해주세요.");
  }

  const { data: application } = await supabase
    .from("applications")
    .insert({ course_id: courseId, student_id: session!.user.id })
    .select("id")
    .single();

  const slotRows = slots.map((slot) => ({
    course_id: courseId,
    user_id: session!.user.id,
    role: "student" as const,
    start_at: slot.start,
    end_at: slot.end,
    capacity: 1,
  }));

  await supabase.from("availability_slots").insert(slotRows);

  revalidatePath(`/student/courses/${courseId}`);
  revalidatePath("/student/applications");
  return application?.id;
}

export async function cancelApplication(applicationId: string) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  await supabase
    .from("applications")
    .update({ status: "cancelled" })
    .eq("id", applicationId)
    .eq("student_id", profile.id);

  revalidatePath("/student/applications");
}
