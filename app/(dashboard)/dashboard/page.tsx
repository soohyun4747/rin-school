import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";

export default async function DashboardPage() {
  const { profile } = await requireSession();

  const shortcuts = {
    admin: [
      { href: "/admin/courses", label: "수업 관리" },
      { href: "/admin/matching", label: "자동 매칭" },
    ],
    student: [
      { href: "/student/courses", label: "수업 목록" },
      { href: "/student/applications", label: "신청 현황" },
      { href: "/student/timetable", label: "시간표" },
    ],
    instructor: [
      { href: "/instructor/subjects", label: "가능 과목" },
      { href: "/instructor/availability", label: "가능 시간" },
      { href: "/instructor/timetable", label: "시간표" },
    ],
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rose-900">안녕하세요, {profile.name || "사용자"}님</h1>
        <p className="text-sm text-rose-800">역할: {profile.role}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>빠른 이동</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {shortcuts[profile.role].map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="rounded-md border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50"
            >
              {shortcut.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-rose-800">
          {profile.role === "admin" && (
            <ul className="list-disc space-y-1 pl-5">
              <li>수업을 등록하고 요일/시간 범위를 설정하세요.</li>
              <li>학생/강사 슬롯이 채워지면 자동 매칭을 실행하세요.</li>
              <li>매칭 결과를 확인하고 일괄 이메일을 발송할 수 있습니다.</li>
            </ul>
          )}
          {profile.role === "student" && (
            <ul className="list-disc space-y-1 pl-5">
              <li>관심 있는 수업을 신청하고 가능한 1시간 슬롯을 선택하세요.</li>
              <li>신청 현황과 확정된 시간표를 확인하세요.</li>
            </ul>
          )}
          {profile.role === "instructor" && (
            <ul className="list-disc space-y-1 pl-5">
              <li>가능한 과목과 학년을 등록하세요.</li>
              <li>가능한 시간 슬롯을 입력하면 배정/시간표에서 확인할 수 있습니다.</li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
