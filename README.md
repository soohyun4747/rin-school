# RinSchool

학생-강사 온라인 수업 시간 매칭 서비스 템플릿입니다. Next.js(App Router, TS), Tailwind, Supabase(Auth + Postgres + RLS)와 Resend(또는 Supabase Edge Functions) 기반으로 설계되었습니다.

## 빠른 시작

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 설정 (`.env.local`)

```bash
SUPABASE_URL="https://...supabase.co"
SUPABASE_ANON_KEY="..."                     # 서버용 익명 키
SUPABASE_SERVICE_ROLE_KEY="..."             # 서버 전용 키
NEXT_PUBLIC_SUPABASE_URL="https://...supabase.co" # 브라우저 사용
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."             # 브라우저 사용
RESEND_API_KEY="..." # 선택, Edge Function 대체 가능
```

3. Supabase 마이그레이션 적용

- SQL 파일: `supabase/migrations/202501010000_init.sql`
- Supabase CLI가 있다면 `supabase db push` 또는 `psql`로 적용합니다.

4. 개발 서버 실행

```bash
npm run dev
```

## 주요 기능

- **역할**: 관리자 / 학생 / 강사
- **DB 스키마**: profiles, courses, course_time_windows, instructor_subjects, applications, availability_slots, matches, match_students, email_batches
- **RLS**: is_admin() 헬퍼 기반. 학생/강사는 본인 데이터만 CRUD, matches/match_students는 본인 관련 read, 관리자는 전체 권한.
- **자동 매칭**: course_id와 기간(from, to)을 받아 신청 순서대로 학생 슬롯을 강사 슬롯과 매칭 (정원 4명 제한). `lib/matching.ts` + `app/actions/matching.ts`.
- **이메일 일괄 발송**: 확정된 매칭을 대상으로 Resend 또는 Supabase Edge Function 호출. 로그는 email_batches에 기록 (`lib/email.ts`).

## 폴더 구조 요약

- `app/` – App Router 페이지, Server Actions (`app/actions/matching.ts`).
- `components/` – 공용 UI 블록 (섹션, 카드, 코드 블록).
- `lib/supabase/` – 서버/클라이언트 분리된 Supabase fetch 래퍼, REST 유틸.
- `lib/matching.ts` – 자동 매칭 알고리즘 (신청 → 슬롯 → 매칭/학생 생성).
- `lib/email.ts` – Resend/Edge Function 이메일 전송 + email_batches 로깅.
- `supabase/migrations/` – Postgres 스키마 + RLS + 트리거 SQL.

## RLS 요약

- **profiles**: 본인 read/update, admin all
- **courses, course_time_windows**: 모든 사용자 read, admin write
- **instructor_subjects**: 본인 CRUD, admin read
- **applications**: 학생 본인 CRUD, admin all
- **availability_slots**: 본인 CRUD, admin all
- **matches/match_students**: admin all, 학생/강사는 본인 관련 read
- **email_batches**: admin all

## 자동 매칭 흐름

1. 신청을 created_at 기준 오름차순으로 정렬
2. 학생 슬롯(시작 시간 기준) 순회하며, 동일 시간의 강사 슬롯을 조회
3. 잔여 정원(capacity, 최대 4명)이 남아있는 매칭을 찾아 match_students에 추가
4. 결과: `matched` / `unmatched` 카운트 반환

구현: `lib/matching.ts`, `app/actions/matching.ts`

## 이메일 발송

- RESEND_API_KEY가 있으면 Resend API 사용, 없으면 Supabase Edge Function(`functions/v1/send-match-emails`) 호출
- email_batches 테이블에 subject/body/status/error_message 로그 저장

## 개발 메모

- Tailwind v4 inline 테마 변수를 사용합니다 (`app/globals.css`).
- App Router + Server Actions 기반으로, 추가 API Route 없이 서버 코드를 작성할 수 있습니다.
- RLS 적용으로 서버 액션에서 Service Role 키 사용 시 권한을 주의하세요.
