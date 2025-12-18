import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const days = ["일", "월", "화", "수", "목", "금", "토"];

export default async function StudentCourseDetail({ params }: { params: { id: string } }) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, subject, grade_range, duration_minutes, capacity, image_url")
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  const { data: windows } = await supabase
    .from("course_time_windows")
    .select("id, day_of_week, start_time, end_time")
    .eq("course_id", course.id)
    .order("day_of_week", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[var(--primary-border)] bg-[var(--primary-soft)]">
        {course.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.image_url} alt={`${course.title} 이미지`} className="h-64 w-full object-cover" />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm font-semibold text-[var(--primary)]">
            대표 이미지가 아직 등록되지 않았어요
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-600">
            {course.subject} · {course.grade_range} · {course.duration_minutes}분 · 정원 {course.capacity}
          </p>
        </div>
        <Link
          href={`/student/courses/${course.id}/apply`}
          className="text-[var(--primary)] hover:underline"
        >
          신청하기
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>가능 시간 범위</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(windows ?? []).length === 0 && <p className="text-slate-600">관리자가 아직 시간을 등록하지 않았습니다.</p>}
          {windows?.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-2">
              <span className="font-semibold text-slate-800">{days[w.day_of_week]}</span>
              <span className="text-slate-700">
                {w.start_time} - {w.end_time}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
