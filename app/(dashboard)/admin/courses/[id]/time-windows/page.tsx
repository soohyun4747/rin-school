import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createTimeWindow, deleteTimeWindow } from "@/app/actions/admin";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const days = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
];

export default async function CourseTimeWindowsPage({ params }: { params: { id: string } }) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["admin"]);

  const supabase = await getSupabaseServerClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, subject, grade_range")
    .eq("id", params.id)
    .single();

  if (!course) {
    notFound();
  }

  const { data: windows } = await supabase
    .from("course_time_windows")
    .select("id, day_of_week, start_time, end_time")
    .eq("course_id", course.id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{course.subject} · {course.grade_range}</p>
          <h1 className="text-xl font-semibold text-slate-900">{course.title} 가능 시간 범위</h1>
        </div>
        <Link href="/admin/courses" className="text-[var(--primary)] hover:underline">
          뒤로가기
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시간 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTimeWindow.bind(null, course.id)} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-slate-700">요일</label>
              <Select name="day_of_week" required defaultValue="1">
                {days.map((label, idx) => (
                  <option key={label} value={idx}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">시작 시간</label>
              <Input name="start_time" type="time" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">종료 시간</label>
              <Input name="end_time" type="time" required />
            </div>
            <div className="flex items-end">
              <Button type="submit">추가</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>등록된 시간</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(windows ?? []).length === 0 && <p className="text-slate-600">등록된 시간이 없습니다.</p>}
          <div className="grid gap-2 md:grid-cols-2">
            {windows?.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{days[w.day_of_week]}</p>
                  <p className="text-slate-600">
                    {w.start_time} - {w.end_time}
                  </p>
                </div>
                <form action={deleteTimeWindow.bind(null, w.id, course.id)}>
                  <Button type="submit" variant="ghost" className="text-red-600">
                    삭제
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
