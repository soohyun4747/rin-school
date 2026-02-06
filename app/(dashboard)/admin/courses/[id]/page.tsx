import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime, formatDayTime } from '@/lib/time';
import {
	addStudentToMatch,
	removeStudentFromMatch,
	deleteMatchSchedule,
} from '@/app/actions/admin';
import type { ICourse } from '../page';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import ScheduleProposalGenerator from '@/components/features/schedule-proposal-generator';

type ApplicationRow = {
	id: string;
	student_id: string;
	status: string;
	created_at: string;
	application_time_choices: { window_id: string }[];
};

type WindowRow = {
	id: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	instructor_id: string | null;
	instructor_name: string | null;
};

type MatchRow = {
	id: string;
	instructor_id: string | null;
	instructor_name: string | null;
	slot_start_at: string;
	slot_end_at: string;
	status: string;
	match_students: { student_id: string }[];
};

export default async function AdminCourseDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);

	const { id } = await params;
	const supabase = await getSupabaseServerClient();

	const { data: courseData } = await supabase
		.from('courses')
		.select(
			'id, title, subject, grade_range, description, duration_minutes, capacity, image_url, weeks, is_closed'
		)
		.eq('id', id)
		.single();

	if (!courseData) notFound();
	const course: ICourse = courseData;

	const [
		{ data: windows },
		{ data: applications },
		{ data: matches },
		{ data: instructors },
	] = await Promise.all([
			supabase
				.from('course_time_windows')
				.select(
					'id, day_of_week, start_time, end_time, instructor_id, instructor_name'
				)
				.eq('course_id', course.id)
				.order('day_of_week', { ascending: true })
				.order('start_time', { ascending: true }),
			supabase
				.from('applications')
				.select(
					'id, student_id, status, created_at, application_time_choices(window_id)'
				)
				.eq('course_id', course.id)
				.order('created_at', { ascending: false }),
			supabase
				.from('matches')
				.select(
					'id, instructor_id, instructor_name, slot_start_at, slot_end_at, status, match_students(student_id)'
				)
				.eq('course_id', course.id)
				.order('slot_start_at', { ascending: true }),
			supabase
				.from('profiles')
				.select('id, name, email')
				.eq('role', 'instructor')
				.order('name', { ascending: true }),
		]);

	const profileIds = new Set<string>();
	(windows as WindowRow[] | null)?.forEach((w) => {
		if (w.instructor_id) profileIds.add(w.instructor_id);
	});
	(applications as ApplicationRow[] | null)?.forEach((app) =>
		profileIds.add(app.student_id)
	);
	(matches as MatchRow[] | null)?.forEach((m) => {
		m.match_students?.forEach((ms) => profileIds.add(ms.student_id));
		if (m.instructor_id) profileIds.add(m.instructor_id);
	});

	const { data: profiles } = profileIds.size
		? await supabase
				.from('profiles')
				.select(
					'id, name, phone, birthdate, kakao_id, guardian_name'
				)
				.in('id', Array.from(profileIds))
		: {
				data: [] as {
					id: string;
					name: string | null;
					phone: string | null;
					birthdate: string | null;
					kakao_id: string | null;
					guardian_name: string | null;
				}[],
			};
	const profileMap = new Map(profiles?.map((p) => [p.id, p]));

	const windowsRows: WindowRow[] = windows ?? [];
	const applicationRows: ApplicationRow[] = applications ?? [];
	const matchRows: MatchRow[] = matches ?? [];
	const instructorRows =
		(instructors ?? []) as { id: string; name: string | null; email: string | null }[];

	const days = ['일', '월', '화', '수', '목', '금', '토'];
	const choicesByWindow = new Map<string, ApplicationRow[]>();
	applicationRows.forEach((app) => {
		(app.application_time_choices ?? []).forEach((choice) => {
			const list = choicesByWindow.get(choice.window_id) ?? [];
			list.push(app);
			choicesByWindow.set(choice.window_id, list);
		});
	});

	const windowLabel = (w: WindowRow) =>
		`${days[w.day_of_week]} ${w.start_time} - ${w.end_time}`;
	const instructorLabel = (w: {
		instructor_id: string | null;
		instructor_name: string | null;
	}) =>
		w.instructor_id
			? (profileMap.get(w.instructor_id)?.name ?? w.instructor_id)
			: w.instructor_name || '미지정';
	const badgeVariant = (
		status: string
	): 'info' | 'success' | 'warning' | 'danger' => {
		if (status === 'confirmed') return 'success';
		if (status === 'proposed') return 'warning';
		if (status === 'cancelled') return 'danger';
		return 'info';
	};
	const confirmedMatches = matchRows.filter((m) => m.status !== 'proposed');
	const studentOptions = Array.from(
		new Set(applicationRows.map((app) => app.student_id))
	).map((id) => ({
		id,
		name: profileMap.get(id)?.name ?? id,
	}));

	return (
		<div className='space-y-6'>
			<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
				<div className='space-y-1'>
					<p className='text-sm text-slate-500'>수업 상세</p>
					<h1 className='text-2xl font-bold text-slate-900'>
						{course.title}
					</h1>
					<div className='flex items-center gap-2'>
						<p className='text-sm text-slate-600'>
							{course.subject} · {course.grade_range} ·{' '}
							{course.duration_minutes}분 · 정원 {course.capacity}
						</p>
						{course.is_closed && (
							<Badge variant='warning'>신청 마감</Badge>
						)}
					</div>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Link
						href='/admin/courses'
						className='rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
						목록으로 돌아가기
					</Link>
					<Link
						href={`/admin/courses/${course.id}/edit`}
						className='rounded-md border border-[var(--primary-border)] px-3 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
						수업 수정
					</Link>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>시간별 신청 현황</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3 text-sm'>
					{windowsRows.length === 0 && (
						<p className='text-slate-600'>
							등록된 시간이 없습니다.
						</p>
					)}
					{windowsRows.map((w) => {
						const applicants = choicesByWindow.get(w.id) ?? [];
						return (
							<div
								key={w.id}
								className='rounded-md border border-slate-200 bg-white p-4 shadow-sm'>
								<div className='flex flex-wrap items-center justify-between gap-2'>
									<div>
										<p className='text-sm font-semibold text-slate-900'>
											{windowLabel(w)}
										</p>
										<p className='text-xs text-slate-600'>
											강사: {instructorLabel(w)}
										</p>
									</div>
									<Badge variant='info'>
										정원 {course.capacity}명
									</Badge>
								</div>
								<div className='mt-3 space-y-2'>
									<p className='text-xs font-semibold text-slate-700'>
										신청 학생 ({applicants.length})
									</p>
									{applicants.length === 0 ? (
										<p className='text-xs text-slate-600'>
											아직 신청한 학생이 없습니다.
										</p>
									) : (
										<ul className='space-y-2'>
											{applicants.map((app) => (
												<li
													key={`${w.id}-${app.id}`}
													className='flex items-center justify-between rounded-md border border-slate-100 px-3 py-2'>
													<div>
														<p className='text-sm font-semibold text-slate-900'>
															{profileMap.get(
																app.student_id
															)?.name ??
																app.student_id}
														</p>
														<p className='text-xs text-slate-600'>
															{profileMap.get(
																app.student_id
															)?.phone ??
																'연락처 없음'}{' '}
															· {app.status}
														</p>
													</div>
													<span className='text-[11px] text-slate-500'>
														{formatDateTime(
															new Date(
																app.created_at
															)
														)}
													</span>
												</li>
											))}
										</ul>
									)}
								</div>
							</div>
						);
					})}
				</CardContent>
			</Card>
			<Card>
				<ScheduleProposalGenerator
					course={{
						id: course.id,
						capacity: course.capacity,
						duration_minutes: course.duration_minutes,
					}}
					windows={windowsRows}
					applications={applicationRows}
					profiles={profiles ?? []}
					instructors={instructorRows}
				/>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>확정된 일정</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4 text-sm'>
					{confirmedMatches.length === 0 && (
						<p className='text-slate-600'>
							아직 확정된 일정이 없습니다.
						</p>
					)}
					{confirmedMatches.map((match) => {
						const assignedIds = new Set(
							match.match_students.map((ms) => ms.student_id)
						);
						const addableStudents = studentOptions.filter(
							(s) => !assignedIds.has(s.id)
						);
						return (
							<div
								key={match.id}
								className='space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm'>
								<div className='flex flex-wrap items-center justify-between gap-2'>
									<div>
										<p className='text-sm font-semibold text-slate-900'>
											{formatDayTime(
												new Date(match.slot_start_at)
											)}{' '}
											~{' '}
											{formatDayTime(
												new Date(match.slot_end_at)
											)}
										</p>
										<p className='text-xs text-slate-600'>
											강사:{' '}
											{match.instructor_id
												? (profileMap.get(
														match.instructor_id
													)?.name ??
													match.instructor_id)
												: (match.instructor_name ??
													'미지정')}
										</p>
									</div>
									<div className='flex items-center gap-2'>
										<Badge
											variant={badgeVariant(
												match.status
											)}>
											확정됨
										</Badge>
										<form
											action={deleteMatchSchedule.bind(
												null,
												course.id,
												match.id
											)}>
											<ConfirmSubmitButton
												variant='ghost'
												className='text-xs text-red-600'>
												일정 삭제
											</ConfirmSubmitButton>
										</form>
									</div>
								</div>

								<div className='space-y-2'>
									<p className='text-xs font-semibold text-slate-700'>
										배치된 학생
									</p>
									{match.match_students.length === 0 ? (
										<p className='text-xs text-slate-600'>
											배치된 학생이 없습니다.
										</p>
									) : (
										<ul className='space-y-2'>
											{match.match_students.map((ms) => (
												<li
													key={ms.student_id}
													className='flex items-center justify-between rounded-md border border-slate-100 px-3 py-2'>
													<div>
														<p className='text-sm font-semibold text-slate-900'>
															{profileMap.get(
																ms.student_id
															)?.name ??
																ms.student_id}
														</p>
														<p className='text-xs text-slate-600'>
															{profileMap.get(
																ms.student_id
															)?.phone ??
																'연락처 없음'}
														</p>
													</div>
													<form
														action={removeStudentFromMatch.bind(
															null,
															course.id,
															match.id,
															ms.student_id
														)}>
														<ConfirmSubmitButton
															variant='ghost'
															className='text-xs text-red-600'>
															배정 해제
														</ConfirmSubmitButton>
													</form>
												</li>
											))}
										</ul>
									)}
								</div>

								<form
									action={addStudentToMatch.bind(
										null,
										course.id
									)}
									className='flex flex-col gap-2 sm:flex-row sm:items-center'>
									<input
										type='hidden'
										name='match_id'
										value={match.id}
									/>
									<Select
										name='student_id'
										className='sm:w-72'
										required>
										<option value=''>학생 선택</option>
										{addableStudents.map((student) => (
											<option
												key={student.id}
												value={student.id}>
												{student.name}
											</option>
										))}
									</Select>
									<Button
										type='submit'
										disabled={addableStudents.length === 0}
										className='sm:w-auto'>
										학생 추가
									</Button>
								</form>
							</div>
						);
					})}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>신청자 목록</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3 text-sm'>
					{applicationRows.length === 0 && (
						<p className='text-slate-600'>
							아직 신청자가 없습니다.
						</p>
					)}
					{applicationRows.length > 0 && (
						<div className='overflow-hidden rounded-lg border border-slate-200'>
							<table className='min-w-full divide-y divide-slate-200 text-sm'>
								<thead className='bg-slate-50'>
									<tr>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											학생
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											연락처
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											카카오 ID
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											학부모명
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											생년월일
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											선택 시간
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											상태
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											신청일
										</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-slate-100 bg-white'>
									{applicationRows.map((app) => {
										const selections =
											app.application_time_choices ?? [];
										return (
											<tr
												key={app.id}
												className='hover:bg-slate-50'>
												<td className='px-4 py-2 font-semibold text-slate-900'>
													{profileMap.get(
														app.student_id
													)?.name ?? '학생'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{profileMap.get(
														app.student_id
													)?.phone ?? '연락처 없음'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{profileMap.get(
														app.student_id
													)?.kakao_id ?? '미입력'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{profileMap.get(
														app.student_id
													)?.guardian_name ??
														'미입력'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{profileMap.get(
														app.student_id
													)?.birthdate ?? '미입력'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{selections.length === 0
														? '선택 없음'
														: selections
																.map(
																	(
																		choice
																	) => {
																		const w =
																			windowsRows.find(
																				(
																					win
																				) =>
																					win.id ===
																					choice.window_id
																			);
																		return w
																			? windowLabel(
																					w
																				)
																			: '삭제된 시간';
																	}
																)
																.join(', ')}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{app.status}
												</td>
												<td className='px-4 py-2 text-slate-500'>
													{formatDateTime(
														new Date(app.created_at)
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
