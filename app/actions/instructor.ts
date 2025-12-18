"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
  const startAt = String(formData.get("start_at") ?? "");
  const endAt = String(formData.get("end_at") ?? "");

  const slotsFromSelector = slotsString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [start, end] = s.split("|");
      return { start, end };
    });

  const slotsFromRange: { start: string; end: string }[] = [];
  if (!slotsString && startAt && endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    let cursor = new Date(start);
    while (cursor.getTime() + 60 * 60 * 1000 <= end.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + 60 * 60 * 1000);
      slotsFromRange.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    }
  }

  const slots = [...slotsFromSelector, ...slotsFromRange];

  if (slots.length === 0) {
    throw new Error("슬롯을 선택해주세요.");
  }

  const payload = slots.map((slot) => ({
    course_id: courseId || null,
    user_id: profile.id,
    role: "instructor" as const,
    start_at: slot.start,
    end_at: slot.end,
    capacity: 4,
  }));

  await supabase.from("availability_slots").insert(payload);
  revalidatePath("/instructor/availability");
}
