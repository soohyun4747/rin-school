import { addAvailabilitySlots } from "@/app/actions/instructor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import { AvailabilityRequestFields } from "@/components/features/availability-request-fields";

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
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>가능 시간 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={addAvailabilitySlots} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">수업</label>
                <select name="course_id" className="w-full rounded-md border border-slate-200 px-3 py-2" required>
                  <option value="">선택</option>
                  {courses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                요일과 시간대를 1개 이상 입력하면 해당 시간으로 바로 매칭됩니다. 시간 범위마다 한 번씩 저장됩니다.
              </div>
            </div>

            <AvailabilityRequestFields fieldName="availability_json" />

            <div className="flex items-center gap-2">
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
                <p className="text-xs text-[var(--primary)]">{courseMap.get(slot.course_id) ?? `수업 ID: ${slot.course_id}`}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
