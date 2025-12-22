import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function StudentTimetablePage() {
	const { profile } = await requireSession();
	requireRole(profile.role, ['student']);
	const supabase = await getSupabaseServerClient();

	const { data: rows, error } = await supabase
		.from('matches')
		.select(
			'id, course_id, slot_start_at, slot_end_at, instructor_id, instructor_name, status, course:courses(title), match_students!inner(student_id)'
		)
		.eq('match_students.student_id', profile.id)
		.order('slot_start_at', { ascending: true });

	if (error) {
		console.error(error);
	}

	type StudentMatchRow = {
		id: string;
		course_id: string;
		slot_start_at: string;
		slot_end_at: string;
		instructor_id: string | null;
		instructor_name: string | null;
		status: string;
		course: { title?: string } | null;
		match_students: { student_id: string }[];
	};

	const matchRows: StudentMatchRow[] =
		(rows as StudentMatchRow[] | null) ?? [];

	const visibleMatches = matchRows.filter(
		(row) => row.status !== 'proposed' && row.status !== 'cancelled'
	);

	return (
		<div className='space-y-4'>
			<Card>
				<CardHeader>
					<CardTitle>확정된 시간표</CardTitle>
				</CardHeader>
				<CardContent className='space-y-2 text-sm'>
					{visibleMatches.length === 0 && (
						<p className='text-slate-600'>
							아직 확정된 매칭이 없습니다.
						</p>
					)}
					{visibleMatches.map((row) => {
						const instructorName = row.instructor_name;
						return (
							<div
								key={row.id}
								className='rounded-md border border-slate-200 px-4 py-3'>
								<p className='text-sm font-semibold text-slate-900'>
									{row.course?.title ?? '수업'}
								</p>
								<p className='text-xs text-slate-600'>
									{formatDateTime(
										new Date(row.slot_start_at)
									)}
								</p>
								<p className='text-xs text-slate-700'>
									강사: {instructorName ?? '미정'}
								</p>
								<p className='text-xs text-slate-500'>
									상태: {row.status}
								</p>
							</div>
						);
					})}
				</CardContent>
			</Card>
		</div>
	);
}
