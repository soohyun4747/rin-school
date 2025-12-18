import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/time';

type StudentProfile = {
	id: string;
	name: string;
	phone: string | null;
	created_at: string;
};

export default async function AdminStudentsPage() {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const { data: students, error } = await supabase
		.from('profiles')
		.select('id, name, phone, created_at')
		.eq('role', 'student')
		.order('created_at', { ascending: false });

	if (error) {
		console.error(error);
	}

	const { data: applications } = await supabase
		.from('applications')
		.select('id, student_id, status');

	const { data: availability } = await supabase
		.from('availability_slots')
		.select('user_id')
		.eq('role', 'student');

	const appMap = new Map<string, { total: number; pending: number }>();
	(applications ?? []).forEach((app) => {
		const entry = appMap.get(app.student_id) ?? { total: 0, pending: 0 };
		entry.total += 1;
		if (app.status === 'pending') entry.pending += 1;
		appMap.set(app.student_id, entry);
	});

	const availabilityCount = new Map<string, number>();
	(availability ?? []).forEach((slot) => {
		availabilityCount.set(
			slot.user_id,
			(availabilityCount.get(slot.user_id) ?? 0) + 1
		);
	});

	const studentRows: StudentProfile[] = students ?? [];

	return (
		<div className='space-y-6'>
			<div className='space-y-1'>
				<h1 className='text-2xl font-bold text-slate-900'>학생 관리</h1>
				<p className='text-sm text-slate-600'>학생 연락처, 신청 현황, 가능한 시간 슬롯을 표로 확인하세요.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>학생 목록</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					{studentRows.length === 0 && <p className='text-sm text-slate-600'>등록된 학생이 없습니다.</p>}
					{studentRows.length > 0 && (
						<div className='overflow-hidden rounded-lg border border-slate-200'>
							<table className='min-w-full divide-y divide-slate-200 text-sm'>
								<thead className='bg-slate-50'>
									<tr>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>학생</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>연락처</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>신청</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>대기</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>가능 슬롯</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>가입일</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-slate-100 bg-white'>
									{studentRows.map((student) => {
										const stat = appMap.get(student.id) ?? { total: 0, pending: 0 };
										const slots = availabilityCount.get(student.id) ?? 0;
										return (
											<tr key={student.id} className='hover:bg-slate-50'>
												<td className='px-4 py-2 font-semibold text-slate-900'>{student.name || '이름 미입력'}</td>
												<td className='px-4 py-2 text-slate-700'>{student.phone || '연락처 없음'}</td>
												<td className='px-4 py-2 text-slate-700'>{stat.total}건</td>
												<td className='px-4 py-2 text-[var(--primary)]'>{stat.pending}건</td>
												<td className='px-4 py-2 text-slate-700'>{slots}개</td>
												<td className='px-4 py-2 text-slate-500'>{formatDateTime(new Date(student.created_at))}</td>
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
