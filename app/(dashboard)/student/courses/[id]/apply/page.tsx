import { notFound, redirect } from "next/navigation";
import { SlotSelector } from "@/components/features/slot-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateSlotsFromWindows } from "@/lib/time";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { applyToCourse } from "@/app/actions/student";

export default async function StudentApplyPage({ params }: { params: { id: string } }) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, subject, grade_range, duration_minutes, image_url")
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  const { data: windows } = await supabase
    .from("course_time_windows")
    .select("day_of_week, start_time, end_time")
    .eq("course_id", course.id);

  const slots = generateSlotsFromWindows(windows ?? [], { durationMinutes: course.duration_minutes });
  const availableSlots = slots.map((slot) => ({
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
  }));

  async function action(formData: FormData) {
    "use server";
    const selected = String(formData.get("slots") ?? "");
    await applyToCourse(course.id, selected);
    redirect("/student/applications");
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[var(--primary-border)] bg-[var(--primary-soft)]">
        {course.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.image_url} alt={`${course.title} 이미지`} className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-56 items-center justify-center text-sm font-semibold text-[var(--primary)]">
            대표 이미지가 등록되면 이곳에 표시됩니다
          </div>
        )}
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">{course.title} 신청</h1>
        <p className="text-sm text-slate-600">{course.subject} · {course.grade_range}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>가능한 시간 선택 (1시간 단위)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-3">
            <SlotSelector availableSlots={availableSlots} />
            <p className="text-xs text-slate-600">
              * course_time_windows 범위 내 다가오는 2주 동안의 슬롯이 생성됩니다.
            </p>
            <Button type="submit">신청 제출</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
