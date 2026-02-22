import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
	CourseCategoryCourseList,
	type CourseCard,
} from '@/components/features/course-category-course-list';

export default async function ClassesPage() {
	const supabase = await getSupabaseServerClient();
	const { data: courses, error } = await supabase
		.from('courses')
		.select(
			'id, title, subject, grade_range, description, image_url, is_closed'
		)
		.order('display_order', { ascending: false, nullsLast: true })
		.order('created_at', { ascending: false })
		// .limit(12);

	const courseList = courses ?? [];

	if (error) {
		console.error('수업 목록 조회 실패:', error);
	}

	return (
		<div className='mx-auto max-w-6xl px-4 py-12 space-y-8'>
			<div className='space-y-3'>
				<p className='text-sm font-semibold uppercase tracking-wide text-[var(--primary)]'>
					classes
				</p>
				<h1 className='text-3xl font-bold text-slate-900 md:text-4xl'>
					운영 중인 수업
				</h1>
				<p className='text-base text-slate-600'>
					관심 있는 수업을 확인하고, 로그인 후 원하는 시간대를
					신청하세요.
				</p>
			</div>

			{error ? (
				<div className='rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700'>
					수업 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시
					확인해 주세요.
				</div>
			) : courseList.length === 0 ? (
				<div className='rounded-2xl border border-[var(--primary-border)] bg-white p-6 text-sm text-slate-700'>
					아직 등록된 수업이 없습니다. 관리자가 수업을 등록하면 이곳에
					표시됩니다.
				</div>
			) : (
				<CourseCategoryCourseList
					courses={courseList as CourseCard[]}
				/>
			)}
		</div>
	);
}
