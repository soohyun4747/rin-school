-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Helper: admin check
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('admin', 'student', 'instructor')),
  name text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::text, 'student'),
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade_range text,
  subject text,
  duration_minutes int not null default 60,
  capacity int not null default 4,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.course_time_windows (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);

-- Instructor subjects
create table if not exists public.instructor_subjects (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  grade_range text,
  created_at timestamptz not null default now()
);

-- Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'matched', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Availability slots (student/instructor)
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('student', 'instructor')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity int not null default 1,
  created_at timestamptz not null default now()
);

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slot_start_at timestamptz not null,
  slot_end_at timestamptz not null,
  instructor_id uuid not null references public.profiles (id),
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'rescheduled', 'cancelled')),
  updated_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.match_students (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.email_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id),
  subject text not null,
  body text not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_applications_course on public.applications (course_id);
create index if not exists idx_slots_course_role on public.availability_slots (course_id, role);
create index if not exists idx_matches_course on public.matches (course_id, slot_start_at);
create index if not exists idx_match_students_match on public.match_students (match_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_time_windows enable row level security;
alter table public.instructor_subjects enable row level security;
alter table public.applications enable row level security;
alter table public.availability_slots enable row level security;
alter table public.matches enable row level security;
alter table public.match_students enable row level security;
alter table public.email_batches enable row level security;

-- Profiles policies
create policy if not exists "profiles_select_self_or_admin" on public.profiles
  for select using (is_admin() or id = auth.uid());

create policy if not exists "profiles_update_self_or_admin" on public.profiles
  for update using (is_admin() or id = auth.uid())
  with check (is_admin() or id = auth.uid());

create policy if not exists "profiles_insert_admin" on public.profiles
  for insert with check (is_admin());

-- Courses
create policy if not exists "courses_read_all" on public.courses
  for select using (true);

create policy if not exists "courses_admin_insert" on public.courses
  for insert with check (is_admin());

create policy if not exists "courses_admin_update" on public.courses
  for update using (is_admin());

create policy if not exists "courses_admin_delete" on public.courses
  for delete using (is_admin());

-- Course time windows
create policy if not exists "time_windows_read_all" on public.course_time_windows
  for select using (true);

create policy if not exists "time_windows_admin_write" on public.course_time_windows
  for all using (is_admin()) with check (is_admin());

-- Instructor subjects
create policy if not exists "instructor_subjects_read" on public.instructor_subjects
  for select using (is_admin() or instructor_id = auth.uid());

create policy if not exists "instructor_subjects_crud_self" on public.instructor_subjects
  for all
  using (is_admin() or instructor_id = auth.uid())
  with check (is_admin() or instructor_id = auth.uid());

-- Applications
create policy if not exists "applications_select" on public.applications
  for select using (is_admin() or student_id = auth.uid());

create policy if not exists "applications_insert" on public.applications
  for insert with check (is_admin() or student_id = auth.uid());

create policy if not exists "applications_update" on public.applications
  for update using (is_admin() or student_id = auth.uid());

create policy if not exists "applications_delete" on public.applications
  for delete using (is_admin() or student_id = auth.uid());

-- Availability slots
create policy if not exists "slots_select" on public.availability_slots
  for select using (is_admin() or user_id = auth.uid());

create policy if not exists "slots_insert" on public.availability_slots
  for insert with check (is_admin() or user_id = auth.uid());

create policy if not exists "slots_update" on public.availability_slots
  for update using (is_admin() or user_id = auth.uid());

create policy if not exists "slots_delete" on public.availability_slots
  for delete using (is_admin() or user_id = auth.uid());

-- Matches
create policy if not exists "matches_select" on public.matches
  for select using (
    is_admin()
    or instructor_id = auth.uid()
    or exists (
      select 1 from public.match_students ms
      where ms.match_id = matches.id and ms.student_id = auth.uid()
    )
  );

create policy if not exists "matches_admin_write" on public.matches
  for all using (is_admin()) with check (is_admin());

-- Match students
create policy if not exists "match_students_select" on public.match_students
  for select using (
    is_admin()
    or student_id = auth.uid()
    or exists (
      select 1 from public.matches m
      where m.id = match_students.match_id and m.instructor_id = auth.uid()
    )
  );

create policy if not exists "match_students_admin_write" on public.match_students
  for all using (is_admin()) with check (is_admin());

-- Email batches (admin only)
create policy if not exists "email_batches_admin" on public.email_batches
  for all using (is_admin()) with check (is_admin());
