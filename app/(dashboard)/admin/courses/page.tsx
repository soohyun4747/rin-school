import Image from "next/image";
import Link from "next/link";
import { createCourse, deleteCourse } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminCoursesPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["admin"]);
  const supabase = await getSupabaseServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, subject, image_url, grade_range, capacity, duration_minutes, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>수업 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCourse} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-rose-900">수업명</label>
              <Input name="title" placeholder="예: 중등 수학 심화" required />
            </div>
            <div>
              <label className="text-sm font-medium text-rose-900">과목</label>
              <Input name="subject" placeholder="수학" required />
            </div>
            <div>
              <label className="text-sm font-medium text-rose-900">학년 범위</label>
              <Input name="grade_range" placeholder="중1-중3" required />
            </div>
            <div>
              <label className="text-sm font-medium text-rose-900">정원</label>
              <Input name="capacity" type="number" min={1} defaultValue={4} required />
            </div>
            <div>
              <label className="text-sm font-medium text-rose-900">수업 시간(분)</label>
              <Select name="duration_minutes" defaultValue="60">
                <option value="60">60분</option>
                <option value="90">90분</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-rose-900">이미지 URL</label>
              <Input name="image_url" type="url" placeholder="https://example.com/course.jpg" />
            </div>
            <div className="flex items-end">
              <Button type="submit">등록</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>수업 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(courses ?? []).length === 0 && <p className="text-sm text-rose-700">등록된 수업이 없습니다.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {courses?.map((course) => (
              <div key={course.id} className="rounded-lg border border-rose-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 gap-3">
                    {course.image_url && (
                      <Image
                        src={course.image_url}
                        alt={`${course.title} 이미지`}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-md border border-rose-100 object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-rose-900">{course.title}</h3>
                      <p className="text-sm text-rose-700">
                        {course.subject} · {course.grade_range} · {course.duration_minutes}분 · 정원 {course.capacity}
                      </p>
                    </div>
                  </div>
                  <form action={deleteCourse.bind(null, course.id)}>
                    <Button variant="ghost" className="text-red-700" type="submit">
                      삭제
                    </Button>
                  </form>
                </div>
                <div className="mt-3 flex gap-2 text-sm">
                  <Link
                    href={`/admin/courses/${course.id}/time-windows`}
                    className="rounded-md border border-rose-200 px-3 py-2 text-rose-800 hover:bg-rose-50"
                  >
                    가능 시간 설정
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
