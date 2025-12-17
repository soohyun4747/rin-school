import Link from "next/link";

import { CodeBlock } from "@/components/code-block";
import { InfoCard } from "@/components/info-card";
import { Section } from "@/components/section";

const roleFeatures = {
  student: [
    "회원가입/로그인 후 프로필 자동 생성",
    "과목·학년별 수업 목록 및 상세 확인",
    "희망 시간대(1시간 슬롯)로 신청 저장",
    "확정된 매칭 시간표 확인",
  ],
  instructor: [
    "담당 과목·학년대 관리",
    "주간 가능 시간 범위 → 슬롯 생성",
    "개설된 수업의 학생 매칭 현황 확인",
    "자신과 관련된 매칭 읽기 권한",
  ],
  admin: [
    "수업 및 시간 범위 등록",
    "자동 매칭 실행 및 결과 확인",
    "슬롯별 학생 이동/강사 변경 (정원 4명 제한)",
    "이메일 일괄 발송 및 로그 관리",
  ],
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <span className="text-lg font-semibold">R</span>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">
                rinschool
              </p>
              <p className="text-sm text-slate-500">
                학생-강사 온라인 수업 시간 매칭
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 sm:flex">
            <Link className="hover:text-sky-700" href="#stack">
              스택
            </Link>
            <Link className="hover:text-sky-700" href="#supabase-clients">
              Supabase
            </Link>
            <Link className="hover:text-sky-700" href="#db-rls">
              DB & RLS
            </Link>
            <Link className="hover:text-sky-700" href="#matching">
              자동 매칭
            </Link>
            <Link className="hover:text-sky-700" href="#ui-flow">
              UI 흐름
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="grid gap-10 rounded-[28px] border border-slate-200/80 bg-white px-8 py-10 shadow-xl shadow-slate-200/40 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Next.js · Supabase · Tailwind
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900">
              RinSchool: 학생-강사 매칭을 위한
              <span className="text-sky-600"> 실무형 Next.js 템플릿</span>
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              App Router + TypeScript + Tailwind로 구성된 웹앱 골격과 Supabase
              스키마/RLS/자동 매칭 로직을 한 번에 제공합니다. 관리자·학생·강사
              역할별로 필요한 화면/서버 액션/정책을 바로 확장할 수 있습니다.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                App Router + Server Actions
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                Supabase RLS + 트리거
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                자동 매칭 & 이메일 일괄 발송
              </span>
            </div>
          </div>

          <div className="card-shadow rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <p className="text-sm font-semibold text-slate-500">역할별 목표</p>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-green-500" />
                <div>
                  <p className="font-semibold text-slate-900">학생</p>
                  <p className="text-slate-600">수업 신청 + 가능한 시간 슬롯 제출</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
                <div>
                  <p className="font-semibold text-slate-900">강사</p>
                  <p className="text-slate-600">과목/학년 + 가능 시간 범위 등록</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <div>
                  <p className="font-semibold text-slate-900">관리자</p>
                  <p className="text-slate-600">수업/시간 관리 + 자동 매칭 + 이메일</p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs font-medium text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-2xl font-semibold text-slate-900">3</p>
                <p>역할</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-2xl font-semibold text-slate-900">9</p>
                <p>핵심 테이블</p>
              </div>
            </div>
          </div>
        </section>

        <Section
          id="stack"
          title="프로젝트 구성 요소"
          description="Next.js(App Router, TS), Tailwind v4, Supabase(Postgres + Auth + RLS), Resend(또는 Edge Functions) 기반으로 설계되었습니다."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              title="Next.js + Tailwind"
              description="App Router, Server Actions, TypeScript를 기본값으로 사용합니다. Tailwind v4 inline 테마 변수를 적용해 일관된 색상/타이포 스케일을 제공합니다."
              badge="app"
            />
            <InfoCard
              title="Supabase Auth + Postgres"
              description="profiles 트리거, 수업/슬롯/매칭 테이블, RLS 정책까지 포함된 마이그레이션 SQL을 제공합니다."
              badge="db"
            />
            <InfoCard
              title="자동 매칭 & RLS"
              description="학생 슬롯 ↔ 강사 슬롯을 course_id 기준으로 정원 4명까지 할당하는 매칭 알고리즘과 역할별 RLS 정책을 함께 제공합니다."
              badge="matching"
            />
            <InfoCard
              title="이메일 일괄 발송"
              description="확정된 매칭을 Resend 또는 Supabase Edge Function을 통해 학생·강사에게 알리고, email_batches 테이블에 로그를 남깁니다."
              badge="email"
            />
          </div>
        </Section>

        <Section
          id="supabase-clients"
          title="Supabase 클라이언트 분리"
          description="서버 전용(Service Role) 클라이언트와 브라우저 클라이언트를 분리해 RLS와 민감 키를 안전하게 취급합니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock title="lib/supabase/server.ts">
              {`import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) throw new Error("Missing Supabase envs");

  return {
    async fetch(path: string, init?: RequestInit) {
      const token = cookies().get("sb-access-token")?.value;
      const headers = {
        apikey: serviceKey,
        Authorization: \`Bearer \${token ?? serviceKey}\`,
        ...init?.headers,
      } as Record<string, string>;

      return fetch(\`${url}\${path}\`, { ...init, headers });
    },
  };
}
`}
            </CodeBlock>

            <CodeBlock title="lib/supabase/client.ts">
              {`"use client";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anon) throw new Error("Missing public Supabase envs");

  return {
    async fetch(path: string, init?: RequestInit) {
      const headers = {
        apikey: anon,
        Authorization: \`Bearer \${anon}\`,
        ...init?.headers,
      } as Record<string, string>;

      return fetch(\`${url}\${path}\`, { ...init, headers });
    },
  };
}
`}
            </CodeBlock>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            서버 키(SUPABASE_SERVICE_ROLE_KEY)는 서버 액션·자동 매칭·이메일 전송에서만
            사용하며, 브라우저에는 NEXT_PUBLIC_SUPABASE_* 키만 노출합니다.
          </p>
        </Section>

        <Section
          id="db-rls"
          title="DB 스키마 & RLS 정책"
          description="supabase/migrations/202501010000_init.sql에 테이블, RLS, 트리거가 포함되어 있습니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard
              title="핵심 테이블"
              description="profiles, courses, course_time_windows, instructor_subjects, applications, availability_slots, matches, match_students, email_batches"
              badge="schema"
            />
            <InfoCard
              title="RLS 요약"
              description="is_admin() 헬퍼로 관리자 전체 접근, 학생/강사는 본인 레코드만 CRUD(Read-only for matches)."
              badge="rls"
            />
          </div>
          <CodeBlock title="트리거 & RLS 개요">
            {`-- auth.users 회원가입 시 profiles 자동 생성
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, name, phone)
  values (new.id, 'student', new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 예시 정책 (courses)
alter table courses enable row level security;
create policy "courses_read_all" on courses for select using (true);
create policy "courses_admin_write" on courses for insert with check (is_admin());
create policy "courses_admin_update" on courses for update using (is_admin());
create policy "courses_admin_delete" on courses for delete using (is_admin());
`}
          </CodeBlock>
        </Section>

        <Section
          id="roles"
          title="역할별 핵심 기능"
          description="각 역할에 필요한 UI/서버 액션을 MVP 수준으로 제공하며, Supabase RLS로 접근을 제한합니다."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              title="학생"
              description={roleFeatures.student.join(" · ")}
              badge="student"
            />
            <InfoCard
              title="강사"
              description={roleFeatures.instructor.join(" · ")}
              badge="instructor"
            />
            <InfoCard
              title="관리자"
              description={roleFeatures.admin.join(" · ")}
              badge="admin"
            />
          </div>
        </Section>

        <Section
          id="matching"
          title="자동 매칭 로직"
          description="course_id와 기간(from, to)을 입력으로 받아 학생 신청/슬롯과 강사 슬롯을 정원 4명까지 매칭합니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard
              title="동작 방식"
              description="신청 생성일 오름차순 → 학생 슬롯(시작 시간) 오름차순 순회 → 잔여 capacity가 남은 강사 슬롯을 찾으면 matches/match_students에 반영합니다."
              badge="algo"
            />
            <InfoCard
              title="결과"
              description="matched/unmatched 카운트를 반환하며, 이미 존재하는 슬롯 매칭은 upsert로 갱신합니다."
              badge="output"
            />
          </div>

          <CodeBlock title="app/actions/matching.ts (발췌)">
            {`"use server";
import { runAutoMatching } from "@/lib/matching";

export async function runMatchingAction(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const from = String(formData.get("from"));
  const to = String(formData.get("to"));

  const result = await runAutoMatching({ courseId, from, to });
  return result;
}
`}
          </CodeBlock>
        </Section>

        <Section
          id="email"
          title="이메일 일괄 발송"
          description="확정된 매칭(confirmed) 레코드를 가져와 학생·강사 모두에게 발송하고 email_batches에 로그를 남깁니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard
              title="Resend 또는 Edge Function"
              description="RESEND_API_KEY가 설정되면 Resend API를 사용하고, 없으면 Supabase Edge Function 호출로 대체할 수 있도록 추상화했습니다."
              badge="mail"
            />
            <InfoCard
              title="로그"
              description="email_batches 테이블에 subject/body/status/created_by를 저장하고, 실패 시 에러 메시지를 기록합니다."
              badge="logs"
            />
          </div>
          <CodeBlock title="lib/email.ts (핵심)">
            {`export async function sendMatchEmails(batch: EmailBatchInput) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(batch);
  }
  return callEdgeFunction(batch);
}
`}
          </CodeBlock>
        </Section>

        <Section
          id="ui-flow"
          title="UI 흐름"
          description="대시보드 레이아웃(관리자/학생/강사)은 Tailwind 카드/테이블/칩을 활용한 단순한 MVP 형태로 구성할 수 있습니다."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              title="대시보드"
              description="역할별 카드, 진행 중인 신청/슬롯/매칭 상태 위젯"
            />
            <InfoCard
              title="시간표"
              description="주간 캘린더 위에 확정된 matches를 칩 형태로 노출"
            />
            <InfoCard
              title="매칭 조정"
              description="슬롯별 학생 칩 드래그 이동, 강사 교체, 정원 4명 제한 표시"
            />
          </div>
        </Section>

        <Section
          id="next"
          title="실행 및 환경 변수"
          description=".env.local에 Supabase/Resend 키를 추가한 뒤 dev 서버를 실행하세요."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock title="환경 변수">
              {`SUPABASE_URL="https://...supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..." # 서버 전용
NEXT_PUBLIC_SUPABASE_URL="https://...supabase.co" # 브라우저용
NEXT_PUBLIC_SUPABASE_ANON_KEY="..." # 브라우저용
RESEND_API_KEY="..." # 선택
`}
            </CodeBlock>
            <CodeBlock title="개발 서버">
              {`npm install
npm run dev
`}
            </CodeBlock>
          </div>
        </Section>
      </main>
    </div>
  );
}
