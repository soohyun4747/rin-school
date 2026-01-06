import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole, requireSession } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/time';

const days = ['일', '월', '화', '수', '목', '금', '토'];

type StudentRow = {
	id: string;
	username: string | null;
	name: string;
	email: string;
	phone: string | null;
	birthdate: string | null;
	kakao_id: string | null;
	country: string | null;
	guardian_name: string | null;
	created_at: string;
	user_consents?: {
		guardian_email: string | null;
		guardian_status: string;
		age_confirmed: boolean;
	} | null;
};

type ApplicationRow = {
	id: string;
	status: string;
	created_at: string;
	course: { id: string; title: string } | null;
	choices?: {
		window?: {
			id: string;
			day_of_week: number;
			start_time: string;
			end_time: string;
			instructor_name: string | null;
		} | null;
	}[];
};

export default async function AdminStudentDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();
	const { id } = await params;
	const studentId = id;

	const [profileResult, applicationResult] = await Promise.all([
		supabase
			.from('profiles')
			.select(
				`id, username, name, email, phone, birthdate, kakao_id, country, guardian_name, created_at, user_consents(guardian_email, guardian_status, age_confirmed)`
			)
			.eq('id', studentId)
			.eq('role', 'student')
			.maybeSingle(),
		supabase
			.from('applications')
			.select(
				`id, status, created_at, course:course_id(id, title), choices:application_time_choices(window:course_time_windows(id, day_of_week, start_time, end_time, instructor_name))`
			)
			.eq('student_id', studentId)
			.order('created_at', { ascending: false }),
	]);

	if (profileResult.error) {
		console.error(profileResult.error);
	}
	if (applicationResult.error) {
		console.error(applicationResult.error);
	}

	const student = profileResult.data as StudentRow | null;

	if (!student) {
		return notFound();
	}

	const applications: ApplicationRow[] =
		(applicationResult.data as ApplicationRow[] | null) ?? [];
	const consent = student.user_consents ?? null;

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-2xl font-bold text-slate-900'>
						학생 상세
					</h1>
					<p className='text-sm text-slate-600'>
						학생 정보와 신청 내역을 확인하세요.
					</p>
				</div>
				<Link
					href='/admin/students'
					className='text-sm text-[var(--primary)] hover:underline'>
					학생 목록으로 돌아가기
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{student.name || '이름 미입력'}</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3 text-sm text-slate-700'>
					<div className='grid gap-4 sm:grid-cols-2'>
						<div>
							<p className='text-xs text-slate-500'>아이디</p>
							<p className='font-semibold text-slate-900'>
								{student.username || '미입력'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>이메일</p>
							<p className='font-semibold text-slate-900 break-all'>
								{student.email}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>연락처</p>
							<p className='font-semibold text-slate-900'>
								{student.phone || '연락처 없음'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>생년월일</p>
							<p className='font-semibold text-slate-900'>
								{student.birthdate ?? '미입력'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>
								카카오톡 ID
							</p>
							<p className='font-semibold text-slate-900'>
								{student.kakao_id ?? '미입력'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>거주지</p>
							<p className='font-semibold text-slate-900'>
								{student.country ?? '미입력'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>
								학부모 이름
							</p>
							<p className='font-semibold text-slate-900'>
								{student.guardian_name ?? '미입력'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>
								학부모 이메일
							</p>
							<p className='font-semibold text-slate-900'>
								{consent?.guardian_email ?? '미입력'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>
								보호자 동의 상태
							</p>
							<p className='font-semibold text-slate-900'>
								{consent?.guardian_status ?? '미확인'}
							</p>
						</div>
						<div>
							<p className='text-xs text-slate-500'>가입일</p>
							<p className='font-semibold text-slate-900'>
								{formatDateTime(new Date(student.created_at))}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>수업 신청 내역</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3 text-sm text-slate-700'>
					{applications.length === 0 && (
						<p className='text-slate-600'>신청 내역이 없습니다.</p>
					)}
					{applications.map((app) => {
						const timeSummaries =
							app.choices?.map((choice) => {
								const win = choice.window;
								if (!win) return '삭제된 시간';
								return `${days[win.day_of_week]} ${win.start_time} - ${win.end_time}${
									win.instructor_name
										? ` · ${win.instructor_name}`
										: ''
								}`;
							}) ?? [];

						return (
							<div
								key={app.id}
								className='rounded-md border border-slate-200 px-4 py-3'>
								<div className='flex justify-between gap-2'>
									<div>
										<p className='font-semibold text-slate-900'>
											{app.course?.title ?? '수업'}
										</p>
										<p className='text-xs text-slate-600'>
											{formatDateTime(
												new Date(app.created_at)
											)}
										</p>
										<p className='text-xs text-slate-700'>
											상태: {app.status}
										</p>
									</div>
									{app.course?.id ? (
										<Link
											href={`/admin/courses/${app.course.id}`}
											className='text-xs text-[var(--primary)] hover:underline'>
											수업 보기
										</Link>
									) : (
										<span className='text-xs text-slate-400'>
											연결된 수업 없음
										</span>
									)}
								</div>
								{timeSummaries.length > 0 && (
									<p className='text-xs text-slate-600'>
										신청 시간:{' '}
										{timeSummaries.map((summary, idx) => (
											<span key={`${app.id}-${idx}`}>
												{idx > 0 && ', '}
												{summary}
											</span>
										))}
									</p>
								)}
							</div>
						);
					})}
				</CardContent>
			</Card>
		</div>
	);
}
