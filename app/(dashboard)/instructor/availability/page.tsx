import { addAvailabilitySlots } from "@/app/actions/instructor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";

export default async function InstructorAvailabilityPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["instructor"]);
  const supabase = await getSupabaseServerClient();

  const { data: slots } = await supabase
    .from("availability_slots")
    .select("id, start_at, end_at, course_id")
    .eq("user_id", profile.id)
    .eq("role", "instructor")
    .order("start_at", { ascending: true });

  const { data: courses } = await supabase.from("courses").select("id, title");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>가능 시간 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={addAvailabilitySlots} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">수업 (선택)</label>
              <select name="course_id" className="w-full rounded-md border border-slate-200 px-3 py-2">
                <option value="">전체</option>
                {courses?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">시작</label>
              <Input type="datetime-local" name="start_at" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">종료</label>
              <Input type="datetime-local" name="end_at" required />
            </div>
            <div className="md:col-span-3">
              <p className="text-xs text-slate-600">시작~종료 사이의 1시간 슬롯을 자동으로 저장합니다.</p>
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="submit">저장</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>등록된 슬롯</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(slots ?? []).length === 0 && <p className="text-slate-600">등록된 슬롯이 없습니다.</p>}
          {slots?.map((slot) => (
            <div key={slot.id} className="rounded-md border border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{formatDateTime(new Date(slot.start_at))}</p>
              <p className="text-xs text-slate-600">~ {formatDateTime(new Date(slot.end_at))}</p>
              {slot.course_id && (
                <p className="text-xs text-[var(--primary)]">수업 ID: {slot.course_id}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
