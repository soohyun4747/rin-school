import { sendEmailBatch } from "@/app/actions/admin";
import { MatchingForm } from "@/components/features/matching-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";

export default async function AdminMatchingPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["admin"]);

  // ✅ Next.js 15 + @supabase/ssr: 반드시 await
  const supabase = await getSupabaseServerClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("created_at", { ascending: false });

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, course_id, slot_start_at, slot_end_at, instructor_id, status, match_students(student_id)"
    )
    .order("slot_start_at", { ascending: true })
    .limit(50);

  type MatchRow = {
    id: string;
    course_id: string;
    slot_start_at: string;
    slot_end_at: string;
    instructor_id: string;
    status: string;
    match_students: { student_id: string }[];
  };

  const courseRows = courses ?? [];
  const matchRows: MatchRow[] = ((matches as MatchRow[] | null) ?? []).map((m) => ({
    ...m,
    match_students: m.match_students ?? [],
  }));

  const instructorIds = Array.from(new Set(matchRows.map((m) => m.instructor_id)));
  const studentIds = Array.from(
    new Set(matchRows.flatMap((m) => m.match_students.map((ms) => ms.student_id)))
  );
  const profileIds = [...new Set([...instructorIds, ...studentIds])];

  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, name, role").in("id", profileIds)
    : { data: [] as { id: string; name: string | null; role: string }[] };

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));
  const courseMap = new Map(courseRows.map((c) => [c.id, c.title]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>자동 매칭</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchingForm courses={courseRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>확정/제안된 매칭</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {matchRows.length === 0 && <p className="text-slate-600">매칭 내역이 없습니다.</p>}

          <div className="space-y-2">
            {matchRows.map((match) => (
              <div key={match.id} className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {courseMap.get(match.course_id) ?? "수업"} ·{" "}
                      {formatDateTime(new Date(match.slot_start_at))}
                    </p>
                    <p className="text-xs text-slate-600">
                      강사: {profileMap.get(match.instructor_id)?.name ?? match.instructor_id}
                    </p>
                  </div>
                  <Badge variant="success">{match.status}</Badge>
                </div>

                <div className="mt-2 text-xs text-slate-700">
                  학생:
                  {match.match_students.length === 0 && <span> 없음</span>}
                  {match.match_students.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {match.match_students.map((ms) => (
                        <li key={ms.student_id}>
                          {profileMap.get(ms.student_id)?.name ?? ms.student_id}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>확정 대상 이메일 발송 (Stub)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={sendEmailBatch} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">제목</label>
              <Input name="subject" defaultValue="[린스쿨] 매칭 안내" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">본문</label>
              <Textarea
                name="body"
                rows={4}
                placeholder="매칭 결과 안내 템플릿을 입력하세요."
                required
              />
            </div>
            <p className="text-xs text-slate-500">
              실제 발송은 Stub 이며, email_batches 테이블에 로그가 남습니다. (Resend 등 연동 TODO)
            </p>
            <Button type="submit">로그 저장</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
