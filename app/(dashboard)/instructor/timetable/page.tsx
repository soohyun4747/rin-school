import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";

export default async function InstructorTimetablePage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["instructor"]);
  const supabase = await getSupabaseServerClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, course_id, slot_start_at, slot_end_at, status, courses(title), match_students(student_id)")
    .eq("instructor_id", profile.id)
    .order("slot_start_at", { ascending: true });

  type InstructorMatch = {
    id: string;
    course_id: string;
    slot_start_at: string;
    slot_end_at: string;
    status: string;
    courses?: { title?: string } | null;
    match_students: { student_id: string }[];
  };

  const matchRows: InstructorMatch[] = (matches as InstructorMatch[] | null) ?? [];

  const studentIds = Array.from(
    new Set(matchRows.flatMap((m) => m.match_students?.map((ms) => ms.student_id) ?? []))
  );
  const { data: students } = studentIds.length
    ? await supabase.from("profiles").select("id, name").in("id", studentIds)
    : { data: [] as { id: string; name: string | null }[] };
  const studentMap = new Map((students ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>배정/등록 수업</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {matchRows.length === 0 && <p className="text-slate-600">배정된 수업이 없습니다.</p>}
          {matchRows.map((match) => (
            <div key={match.id} className="rounded-md border border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{match.courses?.title ?? "수업"}</p>
              <p className="text-xs text-slate-600">{formatDateTime(new Date(match.slot_start_at))}</p>
              <p className="text-xs text-slate-500">상태: {match.status}</p>
              <p className="text-xs text-slate-700">
                학생: {match.match_students?.map((ms) => studentMap.get(ms.student_id) ?? ms.student_id).join(", ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
