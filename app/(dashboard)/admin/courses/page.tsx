import Link from 'next/link';
import { deleteCourse } from '@/app/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CourseCreateModal } from '@/components/features/course-create-modal';

export interface ICourse {
	id: string;
	title: string;
	subject: string;
	grade_range: string;
	description: string | null;
	capacity: number;
	duration_minutes: number;
	weeks: number;
	created_at: number;
	image_url: string;
}

export default async function AdminCoursesPage() {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();
	const [{ data: courses, error }, { data: instructors }] = await Promise.all([
		supabase
			.from('courses')
			.select(
				'id, title, subject, grade_range, description, capacity, duration_minutes, created_at, image_url, weeks'
			)
			.order('created_at', { ascending: false }),
		supabase
			.from('profiles')
			.select('id, name, email')
			.eq('role', 'instructor')
			.order('name', { ascending: true }),
	]);

	if (error) {
		console.error(error);
	}

	return (
		<div className='space-y-6'>
			<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-bold text-slate-900'>수업 관리</h1>
					<p className='text-sm text-slate-600'>수업을 등록하고, 등록된 수업을 눌러 상세 관리 페이지로 이동하세요.</p>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<Link
						href='/admin/notifications'
						className='rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
						알림 이메일 관리
					</Link>
					<CourseCreateModal instructors={instructors ?? []} />
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>수업 목록</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					{(courses ?? []).length === 0 && (
						<p className='text-sm text-slate-600'>
							등록된 수업이 없습니다.
						</p>
					)}
					<div className='grid gap-3 md:grid-cols-2'>
						{courses?.map((course: ICourse) => (
							<div
								key={course.id}
								className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3'>
								<Link
									href={`/admin/courses/${course.id}`}
									className='flex gap-3 group'>
									<div className='h-24 w-24 overflow-hidden rounded-md bg-[var(--primary-soft)] border border-[var(--primary-border)]'>
										{course.image_url ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={course.image_url}
												alt={`${course.title} 이미지`}
												className='h-full w-full object-cover transition duration-150 group-hover:scale-105'
											/>
										) : (
											<div className='flex h-full w-full items-center justify-center text-xs font-semibold text-[var(--primary)]'>
												이미지 없음
											</div>
										)}
									</div>
									<div className='flex-1'>
										<div className='flex items-start justify-between gap-2'>
											<div>
												<h3 className='text-base font-semibold text-slate-900 group-hover:text-[var(--primary)]'>
													{course.title}
												</h3>
												<div className='mt-1 flex flex-wrap gap-2 text-xs'>
													<span className='rounded-full bg-[var(--primary-soft)] px-2 py-1 font-semibold text-[var(--primary)]'>
														{course.weeks}주 과정
													</span>
												</div>
												<p className='text-sm text-slate-600'>
													{course.subject} ·{' '}
													{course.grade_range} ·{' '}
													{course.duration_minutes}분
												· 정원 {course.capacity}
												</p>
												{course.description && (
													<p className='mt-1 max-h-12 overflow-hidden text-xs text-slate-700'>
														{course.description}
													</p>
												)}
											</div>
										</div>
									</div>
								</Link>
								<div className='flex flex-wrap items-center gap-2 text-sm'>
									<Link
										href={`/admin/courses/${course.id}`}
										className='rounded-md border border-[var(--primary-border)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
											상세 보기
										</Link>
									<Link
										href={`/admin/courses/${course.id}/time-windows`}
										className='rounded-md border border-[var(--primary-border)] px-3 py-2 text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
											시간 관리
										</Link>
									<form action={deleteCourse.bind(null, course.id)} className='ml-auto'>
										<ConfirmSubmitButton
											variant='ghost'
											className='text-red-600'>
											삭제
										</ConfirmSubmitButton>
									</form>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
