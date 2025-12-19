// lib/matching.ts
import { getSupabaseServerClient /*, getSupabaseAdminClient */ } from "@/lib/supabase/server";
import { generateWindowOccurrences, splitWindowByDuration } from "@/lib/time";

interface RunMatchingParams {
  courseId: string;
  from: string;
  to: string;
  requestedBy: string;
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
    const [
      { data: course, error: courseError },
      { data: windows, error: windowsError },
      { data: applications, error: appsError },
      { data: existingMatches, error: matchesError },
    ] =
      await Promise.all([
        supabase
          .from("courses")
          .select("id, duration_minutes, capacity")
          .eq("id", courseId)
          .single(),
        supabase
          .from("course_time_windows")
          .select("id, day_of_week, start_time, end_time, instructor_id, instructor_name, capacity")
          .eq("course_id", courseId),
        supabase
          .from("applications")
          .select("id, student_id, created_at, application_time_choices(window_id)")
          .eq("course_id", courseId)
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
        supabase
          .from("matches")
          .select("id, slot_start_at, slot_end_at, instructor_id, instructor_name, match_students(student_id)")
          .eq("course_id", courseId)
          .gte("slot_start_at", from)
          .lte("slot_end_at", to),
      ]);

    if (courseError || !course) throw courseError || new Error("수업 정보를 불러오지 못했습니다.");
    if (windowsError) throw windowsError;
    if (appsError) throw appsError;
    if (matchesError) throw matchesError;

    const toMinutes = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    const sortedWindows =
      windows
        ?.slice()
        .sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
          if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
          const aDuration = toMinutes(a.end_time) - toMinutes(a.start_time);
          const bDuration = toMinutes(b.end_time) - toMinutes(b.start_time);
          return aDuration - bDuration;
        }) ?? [];

    const slotWindows =
      sortedWindows.flatMap((w) => {
        try {
          return splitWindowByDuration(w, course.duration_minutes).map((slot) => ({
            ...slot,
            id: w.id,
            windowId: w.id,
          }));
        } catch {
          return [
            {
              ...w,
              id: w.id,
              windowId: w.id,
            },
          ];
        }
      }) ?? [];

    const uniqueSlotMap = new Map<string, (typeof slotWindows)[number]>();
    slotWindows.forEach((slot) => {
      const key = `${slot.day_of_week}-${slot.start_time}-${slot.end_time}-${slot.instructor_id ?? "none"}-${slot.instructor_name ?? "none"}`;
      if (!uniqueSlotMap.has(key)) {
        uniqueSlotMap.set(key, slot);
      }
    });
    const normalizedSlots = Array.from(uniqueSlotMap.values());

    const occurrences = generateWindowOccurrences(normalizedSlots, { from: new Date(from), to: new Date(to) });

    const occurrenceStates = occurrences
      .map((occ) => {
        const occStartTime = `${occ.start.getHours().toString().padStart(2, "0")}:${occ.start
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
        const windowInfo = normalizedSlots.find(
          (w) => w.windowId === occ.windowId && w.start_time === occStartTime && w.day_of_week === occ.start.getDay()
        );
        if (!windowInfo) return null;
        const key = `${windowInfo.instructor_id ?? "none"}-${occ.start.toISOString()}`;
        const match = existingMatches?.find(
          (m) => m.slot_start_at === occ.start.toISOString() && (m.instructor_id ?? "none") === (windowInfo.instructor_id ?? "none")
        );
        const remaining = course.capacity - (match?.match_students?.length ?? 0);
        return {
          window: windowInfo,
          start: occ.start,
          end: occ.end,
          key,
          matchId: match?.id ?? null,
          remaining: remaining > 0 ? remaining : 0,
        };
      })
      .filter((occ): occ is NonNullable<typeof occ> => Boolean(occ));

    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const app of applications ?? []) {
      const choices = (app.application_time_choices ?? []).map((c) => c.window_id);
      let matched = false;

      for (const windowId of choices) {
        const candidates = occurrenceStates
          .filter((occ) => occ.window.id === windowId && occ.remaining > 0)
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        if (candidates.length === 0) continue;

        const picked = candidates[0];

        let matchId = picked.matchId;
        if (!matchId) {
          const { data: match, error: matchInsertError } = await supabase
            .from("matches")
            .insert({
              course_id: courseId,
              slot_start_at: picked.start.toISOString(),
              slot_end_at: picked.end.toISOString(),
              instructor_id: picked.window.instructor_id,
              instructor_name: picked.window.instructor_name,
              status: "confirmed",
              updated_by: requestedBy,
            })
            .select("id")
            .single();

          if (matchInsertError || !match?.id) {
            continue;
          }
          matchId = match.id;
          picked.matchId = match.id;
        }

        const insertRes = await supabase
          .from("match_students")
          .insert({ match_id: matchId, student_id: app.student_id });

        if (insertRes.error) {
          continue;
        }

        await supabase.from("applications").update({ status: "matched" }).eq("id", app.id);

        picked.remaining -= 1;
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
