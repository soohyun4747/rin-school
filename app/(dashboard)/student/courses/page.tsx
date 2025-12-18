import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function StudentCoursesPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, subject, grade_range, capacity, image_url")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>수업 목록</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(courses ?? []).length === 0 && <p className="text-sm text-slate-600">수업이 없습니다.</p>}
          {courses?.map((course) => (
            <div key={course.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="aspect-[4/3] overflow-hidden rounded-md border border-[var(--primary-border)] bg-[var(--primary-soft)]">
                {course.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.image_url} alt={`${course.title} 이미지`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--primary)]">
                    대표 이미지가 없습니다
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{course.title}</h3>
                <p className="text-sm text-slate-600">
                  {course.subject} · {course.grade_range} · 정원 {course.capacity}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <Link
                  href={`/student/courses/${course.id}`}
                  className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  상세
                </Link>
                <Link
                  href={`/student/courses/${course.id}/apply`}
                  className="rounded-md border border-[var(--primary-border)] px-3 py-2 text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                >
                  신청
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
