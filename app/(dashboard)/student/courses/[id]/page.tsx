import Image from "next/image";
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
    .select("id, title, subject, image_url, grade_range, duration_minutes, capacity")
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-rose-900">{course.title}</h1>
          <p className="text-sm text-rose-700">
            {course.subject} · {course.grade_range} · {course.duration_minutes}분 · 정원 {course.capacity}
          </p>
        </div>
        <Link href={`/student/courses/${course.id}/apply`} className="text-rose-700 hover:underline">
          신청하기
        </Link>
      </div>
      {course.image_url && (
        <div className="relative h-56 overflow-hidden rounded-lg border border-rose-200 bg-white">
          <Image src={course.image_url} alt={`${course.title} 이미지`} fill className="object-cover" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>가능 시간 범위</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(windows ?? []).length === 0 && <p className="text-rose-700">관리자가 아직 시간을 등록하지 않았습니다.</p>}
          {windows?.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-md border border-rose-200 px-4 py-2">
              <span className="font-semibold text-rose-900">{days[w.day_of_week]}</span>
              <span className="text-rose-700">
                {w.start_time} - {w.end_time}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
