"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildSlotsFromDayTimeRanges } from "@/lib/time";
import { runMatching } from "@/lib/matching";

export async function addInstructorSubject(formData: FormData) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["instructor"]);
  const supabase = await getSupabaseServerClient();

  const subject = String(formData.get("subject") ?? "").trim();
  const gradeRange = String(formData.get("grade_range") ?? "").trim();
  if (!subject || !gradeRange) {
    throw new Error("과목과 학년을 입력해주세요.");
  }

  await supabase.from("instructor_subjects").insert({
    instructor_id: profile.id,
    subject,
    grade_range: gradeRange,
  });

  revalidatePath("/instructor/subjects");
}

export async function deleteInstructorSubject(id: string) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["instructor"]);
  const supabase = await getSupabaseServerClient();
  await supabase.from("instructor_subjects").delete().eq("id", id).eq("instructor_id", profile.id);
  revalidatePath("/instructor/subjects");
}

export async function addAvailabilitySlots(formData: FormData) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["instructor"]);
  const supabase = await getSupabaseServerClient();

  const courseId = String(formData.get("course_id") ?? "");
  const slotsString = String(formData.get("slots") ?? "");
  const availabilityRaw = String(formData.get("availability_json") ?? "[]");
  const startAt = String(formData.get("start_at") ?? "");
  const endAt = String(formData.get("end_at") ?? "");

  if (!courseId) {
    throw new Error("수업을 선택해주세요.");
  }

  let availabilityRanges: { day_of_week: number; start_time: string; end_time: string }[] = [];
  try {
    availabilityRanges = JSON.parse(availabilityRaw);
  } catch (error) {
    console.error("availability parse error", error);
  }

  const slotsFromRanges = buildSlotsFromDayTimeRanges(availabilityRanges);

  const slotsFromSelector = slotsString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [start, end] = s.split("|");
      return { start, end };
    });

  const slotsFromRangeInput: { start: string; end: string }[] = [];
  if (!slotsString && startAt && endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (start < end) {
      slotsFromRangeInput.push({ start: start.toISOString(), end: end.toISOString() });
    }
  }

  const slots = [...slotsFromRanges, ...slotsFromSelector, ...slotsFromRangeInput];

  if (slots.length === 0) {
    throw new Error("가능 시간을 1개 이상 입력해주세요.");
  }

  const payload = slots.map((slot) => ({
    course_id: courseId,
    user_id: profile.id,
    role: "instructor" as const,
    start_at: slot.start,
    end_at: slot.end,
    capacity: 4,
  }));

  await supabase.from("availability_slots").insert(payload);

  try {
    const starts = payload.map((p) => new Date(p.start_at).getTime());
    const ends = payload.map((p) => new Date(p.end_at).getTime());
    const from = new Date(Math.min(...starts)).toISOString();
    const to = new Date(Math.max(...ends)).toISOString();

    await runMatching({ courseId, from, to, requestedBy: profile.id });
  } catch (error) {
    console.error("강사 자동 매칭 실패", error);
  }

  revalidatePath("/instructor/availability");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
}
