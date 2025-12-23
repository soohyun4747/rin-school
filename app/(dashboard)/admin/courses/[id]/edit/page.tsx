import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CourseEditForm } from '@/components/features/course-edit-form';
import { BackButton } from '@/components/back-button';
import type {
	EditableTimeWindow,
	InstructorOption,
} from '@/components/features/course-form-types';

export default async function AdminCourseEditPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const { id } = await params;

	const supabase = await getSupabaseServerClient();

	const [{ data: course }, { data: windows }, { data: instructors }] =
		await Promise.all([
			supabase
				.from('courses')
				.select(
					'id, title, subject, grade_range, description, capacity, duration_minutes, image_url, weeks'
				)
				.eq('id', id)
				.single(),
			supabase
				.from('course_time_windows')
				.select(
					'day_of_week, start_time, end_time, instructor_id, instructor_name'
				)
				.eq('course_id', id)
				.order('day_of_week', { ascending: true })
				.order('start_time', { ascending: true }),
			supabase
				.from('profiles')
				.select('id, name, email')
				.eq('role', 'instructor')
				.order('name', { ascending: true }),
		]);

	if (!course) notFound();

	const mappedWindows: EditableTimeWindow[] =
		windows?.map((w) => ({
			day_of_week: w.day_of_week,
			start_time: w.start_time.slice(0, 5),
			end_time: w.end_time.slice(0, 5),
			instructor_id: w.instructor_id,
			instructor_name: w.instructor_name,
		})) ?? [];

	return (
		<div className='space-y-6'>
			<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='text-sm text-slate-500'>수업 수정</p>
					<h1 className='text-2xl font-bold text-slate-900'>
						{course.title}
					</h1>
					<p className='text-sm text-slate-600'>
						등록 시 입력했던 정보와 시간을 모두 수정할 수 있습니다.
					</p>
				</div>
				<BackButton />
			</div>

			<Card>
				<CardContent className='pt-6'>
					<CourseEditForm
						course={course}
						instructors={(instructors ?? []) as InstructorOption[]}
						windows={mappedWindows}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
