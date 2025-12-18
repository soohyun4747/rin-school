import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/time';

type InstructorProfile = {
	id: string;
	name: string;
	phone: string | null;
	created_at: string;
};

export default async function AdminInstructorsPage() {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const { data: instructors } = await supabase
		.from('profiles')
		.select('id, name, phone, created_at')
		.eq('role', 'instructor')
		.order('created_at', { ascending: false });

	const { data: subjects } = await supabase
		.from('instructor_subjects')
		.select('instructor_id, subject, grade_range');

	const { data: availability } = await supabase
		.from('availability_slots')
		.select('user_id')
		.eq('role', 'instructor');

	const { data: matches } = await supabase
		.from('matches')
		.select('id, instructor_id, status');

	const subjectMap = new Map<string, { subject: string; grade_range: string }[]>();
	(subjects ?? []).forEach((row) => {
		const list = subjectMap.get(row.instructor_id) ?? [];
		list.push({ subject: row.subject, grade_range: row.grade_range });
		subjectMap.set(row.instructor_id, list);
	});

	const availabilityCount = new Map<string, number>();
	(availability ?? []).forEach((slot) => {
		availabilityCount.set(slot.user_id, (availabilityCount.get(slot.user_id) ?? 0) + 1);
	});

	const matchCount = new Map<string, { total: number; confirmed: number }>();
	(matches ?? []).forEach((m) => {
		const entry = matchCount.get(m.instructor_id) ?? { total: 0, confirmed: 0 };
		entry.total += 1;
		if (m.status === 'confirmed') entry.confirmed += 1;
		matchCount.set(m.instructor_id, entry);
	});

	const instructorRows: InstructorProfile[] = instructors ?? [];

	return (
		<div className='space-y-6'>
			<div className='space-y-1'>
				<h1 className='text-2xl font-bold text-slate-900'>강사 관리</h1>
				<p className='text-sm text-slate-600'>강사별 담당 과목, 가능 시간, 배정 현황을 표로 확인하세요.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>강사 목록</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					{instructorRows.length === 0 && <p className='text-sm text-slate-600'>등록된 강사가 없습니다.</p>}
					{instructorRows.length > 0 && (
						<div className='overflow-hidden rounded-lg border border-slate-200'>
							<table className='min-w-full divide-y divide-slate-200 text-sm'>
								<thead className='bg-slate-50'>
									<tr>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>강사</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>연락처</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>과목</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>가능 슬롯</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>배정</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>가입일</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-slate-100 bg-white'>
									{instructorRows.map((instructor) => {
										const subjectsForInstructor = subjectMap.get(instructor.id) ?? [];
										const slots = availabilityCount.get(instructor.id) ?? 0;
										const matchesForInstructor = matchCount.get(instructor.id) ?? { total: 0, confirmed: 0 };
										return (
											<tr key={instructor.id} className='hover:bg-slate-50'>
												<td className='px-4 py-2 font-semibold text-slate-900'>{instructor.name || '이름 미입력'}</td>
												<td className='px-4 py-2 text-slate-700'>{instructor.phone || '연락처 없음'}</td>
												<td className='px-4 py-2 text-slate-700'>
													{subjectsForInstructor.length === 0 ? (
														<span className='text-slate-500'>미등록</span>
													) : (
														<ul className='list-disc space-y-1 pl-4'>
															{subjectsForInstructor.map((subject) => (
																<li key={`${instructor.id}-${subject.subject}-${subject.grade_range}`}>
																	{subject.subject} · {subject.grade_range}
																</li>
															))}
														</ul>
													)}
												</td>
												<td className='px-4 py-2 text-slate-700'>{slots}개</td>
												<td className='px-4 py-2 text-[var(--primary)]'>
													{matchesForInstructor.confirmed}/{matchesForInstructor.total}
												</td>
												<td className='px-4 py-2 text-slate-500'>{formatDateTime(new Date(instructor.created_at))}</td>
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
