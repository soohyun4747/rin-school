import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";
import type { Role } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

const adminNav = [
  { href: "/admin/courses", label: "수업 관리" },
  { href: "/admin/matching", label: "자동 매칭" },
];

const studentNav = [
  { href: "/student/courses", label: "수업 목록" },
  { href: "/student/applications", label: "신청 현황" },
  { href: "/student/timetable", label: "시간표" },
];

const instructorNav = [
  { href: "/instructor/subjects", label: "가능 과목" },
  { href: "/instructor/availability", label: "가능 시간" },
  { href: "/instructor/timetable", label: "시간표" },
];

function navForRole(role: Role) {
  if (role === "admin") return adminNav;
  if (role === "instructor") return instructorNav;
  return studentNav;
}

export function DashboardShell({ role, children }: PropsWithChildren<{ role: Role }>) {
  const menu = navForRole(role);
  return (
    <div className="min-h-screen bg-rose-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-semibold text-rose-900">
            린스쿨 대시보드
          </Link>
          <form action={logout} className="flex items-center gap-3 text-sm text-rose-700">
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase">
              {role}
            </span>
            <button type="submit" className="text-rose-700 hover:underline">
              로그아웃
            </button>
          </form>
        </div>
        <nav className="border-t bg-rose-100">
          <div className="mx-auto flex max-w-6xl gap-4 px-4 py-2 text-sm font-medium text-rose-800">
            {menu.map((item) => (
              <Link key={item.href} href={item.href} className={cn("rounded-md px-3 py-2 hover:bg-rose-50")}> 
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">{children}</main>
    </div>
  );
}
