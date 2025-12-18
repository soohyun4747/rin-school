import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import { assignStudentToSlot, removeStudentFromMatch, updateMatchSlot } from "@/app/actions/admin";
import type { ICourse } from "../page";

type ApplicationRow = {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
};

type MatchRow = {
  id: string;
  instructor_id: string;
  slot_start_at: string;
  slot_end_at: string;
  status: string;
  match_students: { student_id: string }[];
};

type SlotRow = {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  capacity: number | null;
};

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["admin"]);

  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data } = await supabase
    .from("courses")
    .select(
      "id, title, subject, grade_range, description, duration_minutes, capacity, image_url, is_time_fixed, weeks"
    )
    .eq("id", id)
    .single();

  if (!data) notFound();
  const course: ICourse = data;

  const [{ data: windows }, { data: applications }, { data: matches }, { data: instructorSlots }] =
    await Promise.all([
      supabase
        .from("course_time_windows")
        .select("id, day_of_week, start_time, end_time")
        .eq("course_id", course.id)
        .order("day_of_week", { ascending: true }),
      supabase
        .from("applications")
        .select("id, student_id, status, created_at")
        .eq("course_id", course.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("matches")
        .select("id, instructor_id, slot_start_at, slot_end_at, status, match_students(student_id)")
        .eq("course_id", course.id)
        .order("slot_start_at", { ascending: true }),
      supabase
        .from("availability_slots")
        .select("id, user_id, start_at, end_at, capacity")
        .eq("course_id", course.id)
        .eq("role", "instructor")
        .order("start_at", { ascending: true }),
    ]);

  const profileIds = new Set<string>();

  (applications as ApplicationRow[] | null)?.forEach((app) => profileIds.add(app.student_id));
  (matches as MatchRow[] | null)?.forEach((match) => {
    profileIds.add(match.instructor_id);
    match.match_students?.forEach((ms) => profileIds.add(ms.student_id));
  });
  (instructorSlots as SlotRow[] | null)?.forEach((slot) => profileIds.add(slot.user_id));

  const { data: profiles } = profileIds.size
    ? await supabase.from("profiles").select("id, name, phone, role").in("id", Array.from(profileIds))
    : { data: [] as { id: string; name: string | null; phone: string | null; role: string }[] };

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));
  const matchRows: MatchRow[] = matches ?? [];
  const applicationRows: ApplicationRow[] = applications ?? [];
  const slotRows: SlotRow[] = instructorSlots ?? [];
  const windowsRows = windows ?? [];

  const matchStudentIds = new Set(matchRows.flatMap((m) => m.match_students?.map((s) => s.student_id) ?? []));
  const unmatchedStudents = applicationRows.filter((app) => !matchStudentIds.has(app.student_id));

  const slotsForSelect = slotRows.map((slot) => ({
    id: slot.id,
    label: `${formatDateTime(new Date(slot.start_at))} ~ ${formatDateTime(new Date(slot.end_at))} · ${
      profileMap.get(slot.user_id)?.name ?? "강사"
    }`,
  }));

  const statusOptions = [
    { value: "confirmed", label: "확정" },
    { value: "proposed", label: "제안" },
    { value: "pending", label: "대기" },
    { value: "cancelled", label: "취소" },
  ];

  const days = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">수업 상세</p>
          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-600">
            {course.subject} · {course.grade_range} · {course.duration_minutes}분 · 정원 {course.capacity}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/courses"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            목록으로 돌아가기
          </Link>
          <Link
            href={`/admin/courses/${course.id}/time-windows`}
            className="rounded-md border border-[var(--primary-border)] px-3 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]"
          >
            가능 시간 관리
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>매칭 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {matchRows.length === 0 && <p className="text-slate-600">매칭된 일정이 없습니다.</p>}

            <div className="space-y-3">
              {matchRows.map((match) => {
                const slot = slotRows.find(
                  (s) => s.user_id === match.instructor_id && s.start_at === match.slot_start_at && s.end_at === match.slot_end_at
                );

                const matchedStudents = match.match_students ?? [];

                return (
                  <div
                    key={match.id}
                    className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatDateTime(new Date(match.slot_start_at))} ~ {formatDateTime(new Date(match.slot_end_at))}
                        </p>
                        <p className="text-xs text-slate-600">
                          강사: {profileMap.get(match.instructor_id)?.name ?? match.instructor_id}
                        </p>
                      </div>
                      <Badge variant="success">{match.status}</Badge>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_320px]">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700">배정된 학생</p>
                        {matchedStudents.length === 0 && (
                          <p className="text-xs text-slate-600">아직 학생이 배정되지 않았습니다.</p>
                        )}
                        <ul className="space-y-2">
                          {matchedStudents.map((ms) => (
                            <li
                              key={ms.student_id}
                              className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {profileMap.get(ms.student_id)?.name ?? ms.student_id}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {profileMap.get(ms.student_id)?.phone ?? "연락처 미입력"}
                                </p>
                              </div>
                              <form action={removeStudentFromMatch.bind(null, course.id, match.id, ms.student_id)}>
                                <Button type="submit" variant="ghost" className="text-xs text-red-600">
                                  배정 해제
                                </Button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-800">매칭 정보 수정</p>
                        <form
                          action={updateMatchSlot.bind(null, course.id, match.id)}
                          className="space-y-2 text-xs"
                        >
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-600">강사/시간 슬롯</label>
                            <select
                              name="slot_id"
                              defaultValue={slot?.id}
                              className="w-full rounded-md border border-slate-200 px-3 py-2"
                              required
                            >
                              <option value="">선택</option>
                              {slotsForSelect.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-600">상태</label>
                            <select
                              name="status"
                              defaultValue={match.status}
                              className="w-full rounded-md border border-slate-200 px-3 py-2"
                            >
                              {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <Button type="submit" className="w-full">
                            수정 저장
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신청자 목록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {applicationRows.length === 0 && <p className="text-slate-600">아직 신청자가 없습니다.</p>}

            {applicationRows.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">학생</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">연락처</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">상태</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">신청일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {applicationRows.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-semibold text-slate-900">{profileMap.get(app.student_id)?.name ?? "학생"}</td>
                        <td className="px-4 py-2 text-slate-700">{profileMap.get(app.student_id)?.phone ?? "연락처 없음"}</td>
                        <td className="px-4 py-2 text-slate-700">{app.status}</td>
                        <td className="px-4 py-2 text-slate-500">{formatDateTime(new Date(app.created_at))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {unmatchedStudents.length > 0 && slotsForSelect.length > 0 && (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">수동 배정</p>
                <form action={assignStudentToSlot.bind(null, course.id)} className="mt-2 grid gap-2 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label className="text-[11px] text-slate-600">학생</label>
                    <select name="student_id" className="w-full rounded-md border border-slate-200 px-3 py-2" required>
                      <option value="">선택</option>
                      {unmatchedStudents.map((student) => (
                        <option key={student.id} value={student.student_id}>
                          {profileMap.get(student.student_id)?.name ?? student.student_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[11px] text-slate-600">강사/시간</label>
                    <select name="slot_id" className="w-full rounded-md border border-slate-200 px-3 py-2" required>
                      <option value="">선택</option>
                      {slotsForSelect.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button type="submit" className="w-full">
                      배정 추가
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>수업 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {course.description && <p className="text-slate-700">{course.description}</p>}
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[var(--primary)]">{course.weeks}주 과정</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.is_time_fixed ? "시간 확정" : "시간 협의"}</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">등록된 시간</p>
            {windowsRows.length === 0 && <p className="text-sm text-slate-600">등록된 시간이 없습니다.</p>}
            <div className="grid gap-2 md:grid-cols-2">
              {windowsRows.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <span className="font-semibold text-slate-800">{days[w.day_of_week]}</span>
                  <span className="text-slate-700">
                    {w.start_time} - {w.end_time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
