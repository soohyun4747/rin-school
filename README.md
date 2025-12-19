# 린스쿨 (Lean School) – 학생·강사 온라인 수업 매칭 MVP

Next.js(App Router, TypeScript) + Supabase(Auth/Postgres/RLS)로 구현한 린스쿨 MVP입니다. 관리자/학생/강사 역할별로 수업 등록, 신청, 자동 매칭, 시간표 확인을 제공합니다.

## 주요 기능
- **공통**: Supabase Auth 기반 로그인/회원가입(역할 메타데이터), 보호된 대시보드 라우팅.
- **관리자**
  - 수업 등록/수정/삭제, 요일·시간 범위 설정
  - 자동 매칭 실행(선착순·강사 슬롯 capacity=4·1시간 단위) 및 결과 조회
  - 확정 대상 이메일 발송 Stub + email_batches 로그 저장
- **학생**
  - 수업 목록/상세 확인, 1시간 슬롯 선택 후 신청
  - 신청 현황, 확정된 시간표 확인
- **강사**
  - 가능한 과목/학년 등록
  - 배정/등록 수업 및 시간표 확인

## 폴더 구조 (주요 파일)
- `app/`
  - `(auth)/auth/login`, `(auth)/auth/signup`: 인증 화면
  - `(dashboard)/layout.tsx`: 역할 기반 대시보드 레이아웃/로그아웃
  - `(dashboard)/dashboard`: 역할별 가이드/바로가기
  - `(dashboard)/admin/*`: 수업/시간 설정, 자동 매칭, 이메일 Stub
  - `(dashboard)/student/*`: 수업 목록/신청/신청 목록/시간표
  - `(dashboard)/instructor/*`: 과목 등록, 가능 시간, 시간표
  - `actions/`: server actions (admin/student/instructor/auth)
  - `api/`: 없음(자동 매칭은 server action으로 처리)
- `components/`: UI 컴포넌트(Card, Button 등)와 도메인 컴포넌트(MatchingForm, SlotSelector 등)
- `lib/`: Supabase client(server/browser), auth 헬퍼, 매칭/시간 유틸
- `types/database.ts`: Supabase 테이블 타입 정의
- `schema.sql`, `rls.sql`: DB 스키마, RLS 정책/함수/트리거
- `.env.example`: Supabase 환경 변수 예시

## 실행 방법
1. **의존성 설치**
   ```bash
   npm install
   ```
   > 네트워크 정책에 따라 `@supabase/*` 패키지 설치가 실패할 수 있습니다. 이 경우 사설 프록시/네트워크를 우회하거나 수동으로 패키지를 내려받아 설치하세요.

2. **환경 변수 설정** – `.env` 파일 작성
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
   SUPABASE_SERVICE_ROLE_KEY=service-role-key
   ```

3. **Supabase 설정**
   1) Supabase 프로젝트 생성 후 SQL Editor에서 `schema.sql` 실행
   2) 동일하게 `rls.sql` 실행하여 RLS/정책/함수 적용
   3) 회원가입 시 `raw_user_meta_data`에 `role`, `name`, `phone`을 포함하면 `handle_new_user` 트리거가 `profiles`에 자동 생성합니다. (미지정 시 기본 `student`).
   4) 테스트용 계정: Admin 권한은 `profiles.role = 'admin'`으로 수동 업데이트 가능

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   - 기본 포트: `http://localhost:3000`
   - 로그인 후 `/dashboard`가 역할에 맞는 메뉴를 제공합니다.

## 자동 매칭 로직 요약
- 입력: course_id, from, to
- 절차: pending `applications` → 관리자가 등록한 `course_time_windows` 범위 내 학생 선택 → 가장 빠른 가능 슬롯 기준 선착순 배정 → `matches` insert → `match_students` insert(트리거로 중복/정원 방지) → `applications.status = matched`
- 동시 실행 방지: `matching_runs` 테이블의 running 상태를 확인/갱신

## TODO / 확장 포인트
- Resend 등 이메일 실발송 연동 및 실패 리트라이
- 코스 편집/삭제 시 연쇄 정리, soft-delete 고려
- 학생 신청 중복 방지/대기열 관리, 신청 수정 기능
- 강사 슬롯 삭제/수정 UI
- 매칭 결과 수동 조정/재스케줄링 UI
- E2E 테스트 및 UI 폴리시 강화, form validation 개선
