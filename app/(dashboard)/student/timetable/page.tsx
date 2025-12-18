import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";

export default async function StudentTimetablePage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  const { data: rows } = await supabase
    .from("match_students")
    .select("id, match:matches(id, course_id, slot_start_at, slot_end_at, instructor_id, status, courses(title))")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  type StudentMatchRow = {
    id: string;
    match: {
      id: string;
      course_id: string;
      slot_start_at: string;
      slot_end_at: string;
      instructor_id: string;
      status: string;
      courses?: { title?: string } | null;
    } | null;
  };

  const matchRows: StudentMatchRow[] = (rows as StudentMatchRow[] | null) ?? [];

  const instructorIds = Array.from(
    new Set(matchRows.map((r) => r.match?.instructor_id).filter(Boolean) as string[])
  );
  const { data: instructors } = instructorIds.length
    ? await supabase.from("profiles").select("id, name").in("id", instructorIds)
    : { data: [] as { id: string; name: string | null }[] };
  const instructorMap = new Map((instructors ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>확정된 시간표</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {matchRows.length === 0 && <p className="text-slate-600">아직 확정된 매칭이 없습니다.</p>}
          {matchRows.map((row) => (
            <div key={row.id} className="rounded-md border border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{row.match?.courses?.title ?? "수업"}</p>
              <p className="text-xs text-slate-600">{formatDateTime(new Date(row.match?.slot_start_at))}</p>
              <p className="text-xs text-slate-700">강사: {instructorMap.get(row.match?.instructor_id) ?? row.match?.instructor_id}</p>
              <p className="text-xs text-slate-500">상태: {row.match?.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
