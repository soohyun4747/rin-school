import Image from "next/image";
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
    .select("id, title, subject, image_url, grade_range, capacity")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>수업 목록</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(courses ?? []).length === 0 && <p className="text-sm text-rose-700">수업이 없습니다.</p>}
          {courses?.map((course) => (
            <div key={course.id} className="overflow-hidden rounded-lg border border-rose-200 bg-white shadow-sm">
              {course.image_url && (
                <div className="relative h-40 w-full">
                  <Image
                    src={course.image_url}
                    alt={`${course.title} 이미지`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-base font-semibold text-rose-900">{course.title}</h3>
                <p className="text-sm text-rose-700">
                  {course.subject} · {course.grade_range} · 정원 {course.capacity}
                </p>
              </div>
              <div className="mt-2 flex gap-2 border-t border-rose-100 px-4 py-3 text-sm">
                <Link
                  href={`/student/courses/${course.id}`}
                  className="rounded-md border border-rose-200 px-3 py-2 text-rose-800 hover:bg-rose-50"
                >
                  상세
                </Link>
                <Link
                  href={`/student/courses/${course.id}/apply`}
                  className="rounded-md border border-rose-300 px-3 py-2 text-rose-800 hover:bg-rose-50"
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
