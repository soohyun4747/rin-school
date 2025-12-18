// lib/matching.ts
import { getSupabaseServerClient /*, getSupabaseAdminClient */ } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

interface RunMatchingParams {
  courseId: string;
  from: string;
  to: string;
  requestedBy: string;
}

interface SlotState {
  slot: Tables<"availability_slots">;
  remaining: number;
}

export async function runMatching({ courseId, from, to, requestedBy }: RunMatchingParams) {
  // ✅ Next.js 15에서는 반드시 await
  const supabase = await getSupabaseServerClient();

  // ⚠️ 관리자/배치로 돌릴 거면 아래로 교체:
  // const supabase = getSupabaseAdminClient();

  const existingRun = await supabase
    .from("matching_runs")
    .select("id, status")
    .eq("course_id", courseId)
    .eq("status", "running")
    .maybeSingle();

  if (existingRun.data) {
    throw new Error("이미 실행 중인 매칭 작업이 있습니다.");
  }

  const { data: runRow, error: runInsertError } = await supabase
    .from("matching_runs")
    .insert({
      course_id: courseId,
      status: "running",
      from,
      to,
      created_by: requestedBy,
    })
    .select("id")
    .single();

  if (runInsertError || !runRow?.id) {
    throw new Error("매칭 실행 기록 생성에 실패했습니다.");
  }

  const finalizeRun = async (status: "done" | "failed") => {
    await supabase.from("matching_runs").update({ status }).eq("id", runRow.id);
  };

  try {
    const { data: applications, error: appsError } = await supabase
      .from("applications")
      .select("id, student_id, created_at")
      .eq("course_id", courseId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (appsError) throw appsError;

    const { data: instructorSlots, error: instSlotsError } = await supabase
      .from("availability_slots")
      .select("id, user_id, start_at, end_at, capacity")
      .eq("role", "instructor")
      .eq("course_id", courseId)
      .gte("start_at", from)
      .lte("end_at", to)
      .order("start_at", { ascending: true });

    if (instSlotsError) throw instSlotsError;

    const instructorSlotStates: Record<string, SlotState[]> = {};
    instructorSlots?.forEach((slot) => {
      const key = slot.start_at;
      if (!instructorSlotStates[key]) instructorSlotStates[key] = [];
      instructorSlotStates[key].push({ slot, remaining: slot.capacity });
    });

    const { data: currentMatches, error: matchesError } = await supabase
      .from("matches")
      .select("id, instructor_id")
      .eq("course_id", courseId);

    if (matchesError) throw matchesError;

    const instructorLoad: Record<string, number> = {};
    currentMatches?.forEach((m) => {
      instructorLoad[m.instructor_id] = (instructorLoad[m.instructor_id] ?? 0) + 1;
    });

    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const app of applications ?? []) {
      const { data: studentSlots, error: studentSlotsError } = await supabase
        .from("availability_slots")
        .select("id, start_at, end_at")
        .eq("role", "student")
        .eq("course_id", courseId)
        .eq("user_id", app.student_id)
        .gte("start_at", from)
        .lte("end_at", to)
        .order("start_at", { ascending: true });

      if (studentSlotsError) throw studentSlotsError;

      let matched = false;

      for (const s of studentSlots ?? []) {
        const candidateSlots = (instructorSlotStates[s.start_at] ?? []).filter(
          (x) => x.remaining > 0
        );

        if (candidateSlots.length === 0) continue;

        candidateSlots.sort((a, b) => {
          if (a.remaining === b.remaining) {
            const loadA = instructorLoad[a.slot.user_id] ?? 0;
            const loadB = instructorLoad[b.slot.user_id] ?? 0;
            return loadA - loadB;
          }
          return a.remaining - b.remaining;
        });

        const picked = candidateSlots[0];

        const { data: match, error: matchUpsertError } = await supabase
          .from("matches")
          .upsert(
            {
              course_id: courseId,
              slot_start_at: s.start_at,
              slot_end_at: s.end_at,
              instructor_id: picked.slot.user_id,
              status: "confirmed",
              updated_by: requestedBy,
            },
            { onConflict: "course_id,slot_start_at,instructor_id" }
          )
          .select("id")
          .single();

        if (matchUpsertError || !match?.id) {
          continue;
        }

        const insertRes = await supabase
          .from("match_students")
          .insert({ match_id: match.id, student_id: app.student_id });

        if (insertRes.error) {
          continue;
        }

        await supabase.from("applications").update({ status: "matched" }).eq("id", app.id);

        picked.remaining -= 1;
        instructorLoad[picked.slot.user_id] = (instructorLoad[picked.slot.user_id] ?? 0) + 1;

        matchedCount += 1;
        matched = true;
        break;
      }

      if (!matched) unmatchedCount += 1;
    }

    await finalizeRun("done");
    return { matchedCount, unmatchedCount };
  } catch (error) {
    await finalizeRun("failed");
    throw error;
  }
}
