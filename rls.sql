-- Helper roles
drop function if exists public.is_admin();
create function public.is_admin() returns boolean as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$ language sql stable security definer;

drop function if exists public.is_student();
create function public.is_student() returns boolean as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student');
$$ language sql stable security definer;

drop function if exists public.is_instructor();
create function public.is_instructor() returns boolean as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'instructor');
$$ language sql stable security definer;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_time_windows enable row level security;
alter table public.instructor_subjects enable row level security;
alter table public.applications enable row level security;
alter table public.application_time_choices enable row level security;
alter table public.matches enable row level security;
alter table public.match_students enable row level security;
alter table public.email_batches enable row level security;
alter table public.matching_runs enable row level security;

-- Profiles
create policy "profiles_self_access" on public.profiles
  for select using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles
  using (public.is_admin()) with check (public.is_admin());

-- Courses
create policy "courses_read_all" on public.courses for select using (true);
create policy "courses_admin_all" on public.courses
  using (public.is_admin()) with check (public.is_admin());

-- Course time windows
create policy "time_windows_read_all" on public.course_time_windows for select using (true);
create policy "time_windows_admin_all" on public.course_time_windows
  using (public.is_admin()) with check (public.is_admin());

-- Instructor subjects
create policy "instructor_subjects_owner" on public.instructor_subjects
  for all using (auth.uid() = instructor_id) with check (auth.uid() = instructor_id);
create policy "instructor_subjects_admin" on public.instructor_subjects
  using (public.is_admin()) with check (public.is_admin());

-- Applications
create policy "applications_owner" on public.applications
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "applications_admin" on public.applications
  using (public.is_admin()) with check (public.is_admin());

-- Application time choices
create policy "application_time_choices_owner" on public.application_time_choices
  for all using (exists (select 1 from public.applications a where a.id = application_id and a.student_id = auth.uid()))
  with check (exists (select 1 from public.applications a where a.id = application_id and a.student_id = auth.uid()));
create policy "application_time_choices_admin" on public.application_time_choices
  using (public.is_admin()) with check (public.is_admin());

-- Matches
create policy "matches_admin_all" on public.matches
  using (public.is_admin()) with check (public.is_admin());
create policy "matches_instructor_read" on public.matches
  for select using (auth.uid() = instructor_id);
create policy "matches_student_read" on public.matches
  for select using (exists (
    select 1 from public.match_students ms where ms.match_id = id and ms.student_id = auth.uid()
  ));

-- Match students
create policy "match_students_admin" on public.match_students
  using (public.is_admin()) with check (public.is_admin());
create policy "match_students_owner" on public.match_students
  for select using (auth.uid() = student_id);

-- Email batches
create policy "email_batches_admin" on public.email_batches
  using (public.is_admin()) with check (public.is_admin());

-- Matching runs
create policy "matching_runs_admin" on public.matching_runs
  using (public.is_admin()) with check (public.is_admin());
