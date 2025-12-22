-- Schema for 린스쿨 MVP
create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin','student','instructor')),
  name text not null default '',
  email text not null default '',
  phone text,
  birthdate date,
  kakao_id text,
  country text,
  created_at timestamptz not null default now()
);

create table if not exists user_consents (
  user_id uuid primary key references profiles(id) on delete cascade,
  terms_accepted_at timestamptz not null default now(),
  privacy_accepted_at timestamptz not null default now(),
  age_confirmed boolean not null default false,
  guardian_email text,
  guardian_status text not null default 'not_required' check (guardian_status in ('not_required','pending','confirmed')),
  guardian_token text,
  guardian_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subject text not null,
  grade_range text not null,
  description text,
  weeks int not null default 1,
  duration_minutes int not null default 60,
  capacity int not null default 4,
  image_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists course_time_windows (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  instructor_id uuid references profiles(id) on delete set null,
  instructor_name text,
  capacity int not null default 1,
  constraint time_window_valid check (start_time < end_time)
);

create table if not exists application_time_choices (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references applications(id) on delete cascade,
  window_id uuid not null references course_time_windows(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint application_window_unique unique (application_id, window_id)
);

create table if not exists instructor_subjects (
  id uuid primary key default uuid_generate_v4(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  grade_range text not null
);

create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','matched','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  slot_start_at timestamptz not null,
  slot_end_at timestamptz not null,
  instructor_id uuid references profiles(id) on delete set null,
  instructor_name text,
  status text not null default 'proposed' check (status in ('proposed','confirmed','rescheduled','cancelled')),
  updated_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slot_valid check (slot_start_at < slot_end_at),
  constraint unique_match unique (course_id, slot_start_at, instructor_id)
);

create table if not exists match_students (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint match_student_unique unique (match_id, student_id)
);

create table if not exists email_batches (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references profiles(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','running','done','failed')),
  created_at timestamptz not null default now()
);

create table if not exists matching_runs (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  status text not null check (status in ('running','done','failed')),
  "from" timestamptz not null,
  "to" timestamptz not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_applications_student on applications(student_id);
create index if not exists idx_matches_course_slot on matches(course_id, slot_start_at);
create index if not exists idx_match_students_student on match_students(student_id);
create index if not exists idx_matching_runs_course on matching_runs(course_id);

-- Trigger: profile auto creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, role, name, phone, email, birthdate, kakao_id, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.email, ''),
    to_date(new.raw_user_meta_data->>'birthdate', 'YYYY-MM-DD'),
    new.raw_user_meta_data->>'kakao_id',
    new.raw_user_meta_data->>'country'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: enforce capacity and duplicate assignment
create or replace function public.enforce_match_constraints()
returns trigger as $$
declare
  match_course uuid;
  slot_start timestamptz;
  course_capacity int;
  current_count int;
  duplicate_count int;
begin
  select m.course_id, m.slot_start_at into match_course, slot_start from matches m where m.id = new.match_id;
  if match_course is null then
    raise exception 'Invalid match reference';
  end if;

  select capacity into course_capacity from courses c where c.id = match_course;
  if course_capacity is null then
    course_capacity := 4;
  end if;

  select count(*) into current_count from match_students ms where ms.match_id = new.match_id;
  if current_count >= course_capacity then
    raise exception '매칭 정원을 초과할 수 없습니다';
  end if;

  select count(*) into duplicate_count
  from match_students ms
  join matches m on ms.match_id = m.id
  where ms.student_id = new.student_id
    and m.course_id = match_course
    and m.slot_start_at = slot_start;

  if duplicate_count > 0 then
    raise exception '동일 시간대에 이미 배정되었습니다';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_match_constraints on match_students;
create trigger trg_enforce_match_constraints
  before insert on match_students
  for each row execute procedure public.enforce_match_constraints();
