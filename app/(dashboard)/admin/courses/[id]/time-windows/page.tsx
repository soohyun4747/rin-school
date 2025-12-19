import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { createTimeWindow, deleteTimeWindow } from '@/app/actions/admin';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ICourse } from '../../page';

const days = [
	'일요일',
	'월요일',
	'화요일',
	'수요일',
	'목요일',
	'금요일',
	'토요일',
];

export default async function CourseTimeWindowsPage({
	params,
}: {
	params: Promise<{ id: string }>; // ✅ 여기 포인트
}) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);

	const { id } = await params; // ✅ 여기서 unwrap
	const supabase = await getSupabaseServerClient();

	const { data } = await supabase
		.from('courses')
		.select(
			'id, title, subject, grade_range, description, duration_minutes, capacity, image_url, weeks'
		)
		.eq('id', id) // ✅ params.id 대신 id
		.single();

	if (!data) notFound();

  const course: ICourse = data;

	const [{ data: windows }, { data: instructors }] = await Promise.all([
		supabase
		.from('course_time_windows')
		.select('id, day_of_week, start_time, end_time, instructor_id, instructor_name')
		.eq('course_id', course.id)
		.order('day_of_week', { ascending: true })
		.order('start_time', { ascending: true }),
		supabase
			.from('profiles')
			.select('id, name, email')
			.eq('role', 'instructor')
			.order('name', { ascending: true }),
	]);
	const instructorMap = new Map((instructors ?? []).map((i) => [i.id, i]));

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<div>
					<p className='text-sm text-slate-500'>
						{course.subject} · {course.grade_range}
					</p>
					<h1 className='text-xl font-semibold text-slate-900'>
						{course.title} 가능 시간 범위
					</h1>
				</div>
				<Link
					href='/admin/courses'
					className='text-[var(--primary)] hover:underline'>
					뒤로가기
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>시간 추가</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					<p className='text-xs text-slate-600'>
						입력한 범위는 수업 길이({course.duration_minutes}분)로 자동 분할되며, 각 슬롯은 수업 정원({course.capacity}명)으로 설정됩니다.
					</p>
					<form
						action={createTimeWindow.bind(null, course.id)}
						className='grid grid-cols-1 gap-3 md:grid-cols-6'>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								요일
							</label>
							<Select
								name='day_of_week'
								required
								defaultValue='1'>
								{days.map((label, idx) => (
									<option
										key={label}
										value={idx}>
											{label}
										</option>
								))}
							</Select>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								시작 시간
							</label>
							<Input
								name='start_time'
								type='time'
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								종료 시간
							</label>
							<Input
								name='end_time'
								type='time'
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								강사 선택
							</label>
							<Select name='instructor_id' defaultValue=''>
								<option value=''>직접 입력 또는 미지정</option>
								{instructors?.map((inst) => (
									<option key={inst.id} value={inst.id}>
										{inst.name || '이름 미입력'} ({inst.email || '이메일 없음'})
									</option>
								))}
							</Select>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								강사 이름(직접 입력)
							</label>
							<Input
								name='instructor_name'
								placeholder='예: 외부 강사'
							/>
						</div>
						<div className='flex items-end'>
							<Button type='submit'>
								추가
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>등록된 시간</CardTitle>
				</CardHeader>
				<CardContent className='space-y-2 text-sm'>
					{(windows ?? []).length === 0 && (
						<p className='text-slate-600'>
							등록된 시간이 없습니다.
						</p>
					)}
					<div className='grid gap-2 md:grid-cols-2'>
						{windows?.map((w) => (
							<div
								key={w.id}
								className='flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3'>
								<div>
									<p className='font-semibold text-slate-800'>
										{days[w.day_of_week]}
									</p>
									<p className='text-slate-600'>
										{w.start_time} - {w.end_time}
									</p>
									<p className='text-xs text-slate-600'>
										강사:{' '}
										{instructorMap.get(w.instructor_id ?? '')?.name ||
											w.instructor_name ||
											w.instructor_id ||
											'미지정'}{' '}
										· 정원 {course.capacity}명
									</p>
								</div>
								<form
									action={deleteTimeWindow.bind(
										null,
										w.id,
										course.id
									)}>
									<ConfirmSubmitButton
										variant='ghost'
										className='text-red-600'>
										삭제
									</ConfirmSubmitButton>
								</form>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
