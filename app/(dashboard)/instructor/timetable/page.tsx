import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/time';

export default async function InstructorTimetablePage() {
	const { profile } = await requireSession();
	requireRole(profile.role, ['instructor']);
	const supabase = await getSupabaseServerClient();

	const { data: matches } = await supabase
		.from('matches')
		.select(
			'id, course_id, slot_start_at, slot_end_at, status, courses(title), match_students(student_id)'
		)
		.eq('instructor_id', profile.id)
		.order('slot_start_at', { ascending: true });

	type InstructorMatch = {
		id: string;
		course_id: string;
		slot_start_at: string;
		slot_end_at: string;
		status: string;
		courses?: { title?: string } | null;
		match_students: { student_id: string }[];
	};

	const matchRows: InstructorMatch[] =
		(matches as InstructorMatch[] | null) ?? [];

	const studentIds = Array.from(
		new Set(
			matchRows.flatMap(
				(m) => m.match_students?.map((ms) => ms.student_id) ?? []
			)
		)
	);
	const { data: students } = studentIds.length
		? await supabase
				.from('profiles')
				.select('id, name, email, phone, birthdate, kakao_id, country')
				.in('id', studentIds)
		: {
				data: [] as {
					id: string;
					name: string | null;
					email: string;
					phone: string | null;
					birthdate: string | null;
					kakao_id: string | null;
					country: string | null;
				}[],
		};
	const studentMap = new Map((students ?? []).map((s) => [s.id, s]));

	const visibleMatches = matchRows.filter(
		(match) => match.status !== 'proposed' && match.status !== 'cancelled'
	);

	const formatBirthdate = (value: string | null) => {
		if (!value) return '-';
		try {
			return new Date(value).toLocaleDateString('ko-KR');
		} catch {
			return value;
		}
	};

	return (
		<div className='space-y-4'>
			<Card>
				<CardHeader>
					<CardTitle>배정/등록 수업</CardTitle>
				</CardHeader>
				<CardContent className='space-y-2 text-sm'>
					{visibleMatches.length === 0 && (
						<p className='text-slate-600'>
							배정된 수업이 없습니다.
						</p>
					)}
					{visibleMatches.map((match) => {
						const studentRows =
							match.match_students?.map((ms) => ({
								id: ms.student_id,
								profile: studentMap.get(ms.student_id),
							})) ?? [];
						return (
							<div
								key={match.id}
								className='space-y-3 rounded-md border border-slate-200 px-4 py-3'>
								<div className='space-y-1'>
									<p className='text-sm font-semibold text-slate-900'>
										{match.courses?.title ?? '수업'}
									</p>
									<p className='text-xs text-slate-600'>
										{formatDateTime(
											new Date(match.slot_start_at)
										)}
									</p>
									<p className='text-xs text-slate-500'>
										상태: {match.status}
									</p>
								</div>

								<div className='overflow-x-auto'>
									<table className='min-w-full text-xs'>
										<thead>
											<tr className='bg-slate-50 text-slate-700'>
												<th className='whitespace-nowrap px-3 py-2 text-left font-semibold'>
													학생명
												</th>
												<th className='whitespace-nowrap px-3 py-2 text-left font-semibold'>
													이메일
												</th>
												<th className='whitespace-nowrap px-3 py-2 text-left font-semibold'>
													전화번호
												</th>
												<th className='whitespace-nowrap px-3 py-2 text-left font-semibold'>
													생년월일
												</th>
												<th className='whitespace-nowrap px-3 py-2 text-left font-semibold'>
													카카오 ID
												</th>
												<th className='whitespace-nowrap px-3 py-2 text-left font-semibold'>
													국가
												</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-slate-100'>
											{studentRows.length === 0 ? (
												<tr>
													<td
														className='px-3 py-2 text-center text-slate-600'
														colSpan={6}>
														학생 배정 정보가
														없습니다.
													</td>
												</tr>
											) : (
												studentRows.map((student) => (
													<tr key={student.id}>
														<td className='whitespace-nowrap px-3 py-2 font-semibold text-slate-900'>
															{student.profile
																?.name ??
																student.id}
														</td>
														<td className='whitespace-nowrap px-3 py-2 text-slate-700'>
															{student.profile
																?.email ?? '-'}
														</td>
														<td className='whitespace-nowrap px-3 py-2 text-slate-700'>
															{student.profile
																?.phone ?? '-'}
														</td>
														<td className='whitespace-nowrap px-3 py-2 text-slate-700'>
															{formatBirthdate(
																student
																	.profile
																	?.birthdate ??
																	null
															)}
														</td>
														<td className='whitespace-nowrap px-3 py-2 text-slate-700'>
															{student.profile
																?.kakao_id ??
																'-'}
														</td>
														<td className='whitespace-nowrap px-3 py-2 text-slate-700'>
															{student.profile
																?.country ?? '-'}
														</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							</div>
						);
					})}
				</CardContent>
			</Card>
		</div>
	);
}
