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
    .select("id, title, subject, grade_range, capacity, duration_minutes, created_at, image_url")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>수업 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createCourse}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            encType="multipart/form-data"
          >
            <div>
              <label className="text-sm font-medium text-slate-700">수업명</label>
              <Input name="title" placeholder="예: 중등 수학 심화" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">과목</label>
              <Input name="subject" placeholder="수학" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">학년 범위</label>
              <Input name="grade_range" placeholder="중1-중3" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">정원</label>
              <Input name="capacity" type="number" min={1} defaultValue={4} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">수업 시간(분)</label>
              <Select name="duration_minutes" defaultValue="60">
                <option value="60">60분</option>
                <option value="90">90분</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">대표 이미지 (선택)</label>
              <Input name="image" type="file" accept="image/*" />
              <p className="mt-1 text-xs text-slate-500">수업 소개에 사용됩니다. (JPG, PNG 등 이미지 파일)</p>
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
          {(courses ?? []).length === 0 && <p className="text-sm text-slate-600">등록된 수업이 없습니다.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {courses?.map((course) => (
              <div key={course.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex gap-3">
                  <div className="h-24 w-24 overflow-hidden rounded-md bg-[var(--primary-soft)] border border-[var(--primary-border)]">
                    {course.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.image_url} alt={`${course.title} 이미지`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[var(--primary)]">
                        이미지 없음
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{course.title}</h3>
                        <p className="text-sm text-slate-600">
                          {course.subject} · {course.grade_range} · {course.duration_minutes}분 · 정원 {course.capacity}
                        </p>
                      </div>
                      <form action={deleteCourse.bind(null, course.id)}>
                        <Button variant="ghost" className="text-red-600" type="submit">
                          삭제
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link
                    href={`/admin/courses/${course.id}/time-windows`}
                    className="rounded-md border border-[var(--primary-border)] px-3 py-2 text-[var(--primary)] hover:bg-[var(--primary-soft)]"
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
