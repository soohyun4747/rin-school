import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ICourse } from '@/app/(dashboard)/admin/courses/page';
import { applyToCourse } from '@/app/actions/student';
import { splitWindowByDuration } from '@/lib/time';
import { CourseApplicationForm } from '@/components/features/course-application-form';

const days = ['일', '월', '화', '수', '목', '금', '토'];

const origin =
	typeof window !== 'undefined'
		? window.location.origin
		: 'https://rinschool.com';

export default async function StudentCourseDetail({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['student', 'instructor', 'admin']);

	const { id } = await params;

	const isStudent = profile.role === 'student';
	const supabase = await getSupabaseServerClient();

	const { data } = await supabase
		.from('courses')
		.select(
			'id, title, subject, grade_range, description, duration_minutes, capacity, image_url, weeks, is_closed',
		)
		.eq('id', id)
		.single();

	if (!data) notFound();

	const course: ICourse = data;

	if (course.is_closed) {
		redirect(`${origin}/classes`);
	}

	const { data: windows, error } = await supabase
		.from('course_time_windows')
		.select(
			'id, day_of_week, start_time, end_time, instructor_id, instructor_name, profiles (name)',
		)
		.eq('course_id', course.id)
		.order('day_of_week', { ascending: true });

	if (error) {
		console.error({ error });
	}

	const { data: existingApps } = isStudent
		? await supabase
				.from('applications')
				.select('id, status')
				.eq('course_id', course.id)
				.eq('student_id', profile.id)
				.order('created_at', { ascending: false })
				.limit(1)
		: { data: [] as { id: string; status: string }[] };

	const existingApplication = (existingApps ?? [])[0] ?? null;
	const hasActiveApplication =
		isStudent &&
		existingApplication &&
		existingApplication.status !== 'cancelled';

	type ApplicationChoiceRow = {
		window: {
			day_of_week: number;
			start_time: string;
			end_time: string;
			instructor_name: string | null;
			profiles?: { name?: string | null } | null;
		} | null;
	};

	type CustomTimeRequestRow = {
		day_of_week: number;
		start_time: string;
		end_time: string;
	};

	const { data: applicationChoices } =
		isStudent && existingApplication
			? await supabase
					.from('application_time_choices')
					.select(
						'window:course_time_windows(day_of_week, start_time, end_time, instructor_name, profiles(name))',
					)
					.eq('application_id', existingApplication.id)
			: { data: [] as ApplicationChoiceRow[] };

	const { data: customTimeRequests } =
		isStudent && existingApplication
			? await supabase
					.from('application_time_requests')
					.select('day_of_week, start_time, end_time')
					.eq('application_id', existingApplication.id)
					.order('day_of_week', { ascending: true })
			: { data: [] as CustomTimeRequestRow[] };

	async function action(formData: FormData) {
		'use server';
		const selected = formData
			.getAll('window_ids')
			.map((w) => String(w))
			.filter(Boolean);
		const customDays = formData.getAll('custom_day_of_week');
		const customStarts = formData.getAll('custom_start_time');
		const customEnds = formData.getAll('custom_end_time');
		const customTimes = customDays.map((day, index) => ({
			day_of_week: Number(day),
			start_time: String(customStarts[index] ?? ''),
			end_time: String(customEnds[index] ?? ''),
		}));
		await applyToCourse(course.id, selected, customTimes);
		redirect(`${origin}/student/applications`);
	}

	const slotOptions =
		(windows ?? []).flatMap((w) => {
			try {
				return splitWindowByDuration(w, course.duration_minutes).map(
					(slot) => ({
						value: `${w.id}|${slot.start_time}|${slot.end_time}`,
						day_of_week: slot.day_of_week,
						start_time: slot.start_time,
						end_time: slot.end_time,
						instructor_label:
							slot.profiles?.name ?? slot.instructor_name,
					}),
				);
			} catch (err) {
				console.error('slot split failed', err);
				return [
					{
						value: `${w.id}|${w.start_time}|${w.end_time}`,
						day_of_week: w.day_of_week,
						start_time: w.start_time,
						end_time: w.end_time,
						instructor_label: w.profiles?.name ?? w.instructor_name,
					},
				];
			}
		}) ?? [];

	const slotsByDay = slotOptions.reduce((acc, slot) => {
		const list = acc.get(slot.day_of_week) ?? [];
		list.push(slot);
		acc.set(slot.day_of_week, list);
		return acc;
	}, new Map<number, typeof slotOptions>());

	const slotGroups = Array.from(slotsByDay.entries()).map(
		([dayIndex, slots]) => ({
			dayIndex,
			slots,
		}),
	);

	const appliedTimeSummaries =
		applicationChoices
			?.map((choice) => {
				const win = choice.window;
				if (!win) return null;
				const instructorLabel =
					win.profiles?.name ?? win.instructor_name ?? undefined;
				return `${days[win.day_of_week]} ${win.start_time} - ${win.end_time}${
					instructorLabel ? ` · ${instructorLabel}` : ''
				}`;
			})
			.filter(Boolean) ?? [];

	const customTimeSummaries =
		customTimeRequests?.map(
			(time) =>
				`${days[time.day_of_week]} ${time.start_time} - ${time.end_time}`,
		) ?? [];

	return (
		<div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr] mx-auto max-w-6xl px-4 py-12 space-y-8'>
			<div className='space-y-4'>
				<div className='overflow-hidden rounded-lg border border-[var(--primary-border)] bg-[var(--primary-soft)]'>
					{course.image_url ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={course.image_url}
							alt={`${course.title} 이미지`}
							height={1000}
							width={530}
							className='h-auto w-full object-cover'
						/>
					) : (
						<div className='flex h-64 items-center justify-center text-sm font-semibold text-[var(--primary)]'>
							대표 이미지가 아직 등록되지 않았어요
						</div>
					)}
				</div>
			</div>
			<div className='flex flex-col gap-3'>
				<div className='space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
					<div className='flex items-start justify-between gap-3'>
						<div>
							<h1 className='text-xl font-semibold text-slate-900'>
								{course.title}
							</h1>
							<p className='text-sm text-slate-600'>
								{course.subject} · {course.grade_range} ·{' '}
								{course.duration_minutes}분 · 정원{' '}
								{course.capacity}
							</p>
							<div className='mt-2 flex flex-wrap gap-2 text-xs font-semibold'>
								<span className='rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[var(--primary)]'>
									{course.weeks}주 과정
								</span>
							</div>
						</div>
					</div>
					{course.description && (
						<p className='text-sm text-slate-700 whitespace-pre-line'>
							{course.description}
						</p>
					)}
				</div>
				{hasActiveApplication && (
					<div className='space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
						<p className='font-semibold'>
							이미 이 수업을 신청하셨습니다.
						</p>
						<p>
							현재 상태: {existingApplication.status}. 신청
							내역에서 취소한 뒤 다시 신청할 수 있습니다.
						</p>
						<Link
							href='/student/applications'
							className='font-semibold underline'>
							신청 내역으로 이동하기
						</Link>
					</div>
				)}
				{/* <Card>
					<CardHeader>
						<CardTitle>가능 시간 범위</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2 text-sm'>
						{(windows ?? []).length === 0 && (
							<p className='text-slate-600'>
								관리자가 아직 시간을 등록하지 않았습니다.
							</p>
						)}
						{windows?.map((w) => (
							<div
								key={w.id}
								className='flex items-center justify-between rounded-md border border-slate-200 px-4 py-2'>
								<span className='font-semibold text-slate-800'>
									{days[w.day_of_week]}
								</span>
								<span className='text-slate-700'>
									{w.start_time} - {w.end_time}
								</span>
							</div>
						))}
					</CardContent>
				</Card> */}
				{isStudent ? (
					<Card>
						<CardHeader>
							<CardTitle>신청 시간 선택</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<CourseApplicationForm
								slotGroups={slotGroups}
								hasActiveApplication={hasActiveApplication}
								action={action}
								capacity={course.capacity}
							/>
							{hasActiveApplication && (
								<div className='space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700'>
									<p className='font-semibold text-slate-900'>
										내가 신청한 시간
									</p>
									{appliedTimeSummaries.length === 0 &&
									customTimeSummaries.length === 0 ? (
										<p>신청 시간 정보가 없습니다.</p>
									) : (
										<ul className='space-y-1'>
											{appliedTimeSummaries.map(
												(summary, idx) => (
													<li key={`applied-${idx}`}>
														{summary}
													</li>
												),
											)}
											{customTimeSummaries.map(
												(summary, idx) => (
													<li key={`custom-${idx}`}>
														{summary}
													</li>
												),
											)}
										</ul>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<CardTitle>신청 시간 확인</CardTitle>
						</CardHeader>
						<CardContent className='space-y-3 text-sm'>
							<p className='text-slate-700'>
								관리자와 강사는 신청 없이 시간 정보를 확인할 수
								있습니다. 신청은 학생 계정으로만 가능합니다.
							</p>
							{slotGroups.length === 0 && (
								<p className='text-slate-600'>
									등록된 시간이 없습니다.
								</p>
							)}
							{slotGroups.map(({ dayIndex, slots }) => (
								<div
									key={dayIndex}
									className='space-y-2 rounded-lg border border-slate-200 p-3'>
									<p className='text-sm font-semibold text-slate-800'>
										{days[dayIndex]}
									</p>
									<div className='space-y-2'>
										{slots.map((slot) => (
											<div
												key={slot.value}
												className='flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm'>
												<div>
													<p className='font-semibold text-slate-900'>
														{slot.start_time} -{' '}
														{slot.end_time}
													</p>
													<p className='text-xs text-slate-600'>
														강사:{' '}
														{slot.instructor_label}{' '}
														· 정원 {course.capacity}
														명
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
