import Image from 'next/image';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

type CourseCard = {
	id: string;
	title: string;
        subject: string;
        grade_range: string;
        description: string | null;
        image_url: string | null;
        is_closed: boolean;
};

const fallbackCourseImage =
	'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80';

export default async function ClassesPage() {
        const supabase = await getSupabaseServerClient();
        const { data: courses, error } = await supabase
                .from('courses')
                .select('id, title, subject, grade_range, description, image_url, is_closed')
                .order('display_order', { ascending: false, nullsLast: true })
                .order('created_at', { ascending: false })
                .limit(12);

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
				<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                                        {courseList.map((course: CourseCard) => {
                                                const card = (
                                                        <article
                                                                className='relative overflow-hidden rounded-2xl border border-[var(--primary-border)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg'
                                                                aria-label={course.title}>
                                                                <div className='relative h-44 w-full bg-slate-100'>
                                                                        <Image
                                                                                src={
                                                                                        course.image_url ||
                                                                                        fallbackCourseImage
                                                                                }
                                                                                alt={`${course.title} 이미지`}
                                                                                fill
                                                                                className={
                                                                                        course.is_closed
                                                                                                ? 'object-cover brightness-75'
                                                                                                : 'object-cover'
                                                                                }
                                                                                sizes='(min-width: 1024px) 320px, (min-width: 768px) 45vw, 90vw'
                                                                        />
                                                                        {course.is_closed && (
                                                                                <span className='absolute left-3 top-3 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm'>
                                                                                        신청 마감
                                                                                </span>
                                                                        )}
                                                                </div>

                                                                <div className='space-y-2 p-4'>
                                                                        <div className='flex items-center justify-between text-xs uppercase tracking-wide text-slate-500'>
                                                                                <span>{course.subject}</span>
                                                                                <span className='rounded-full bg-[var(--primary-soft)] px-2 py-1 text-[var(--primary)]'>
                                                                                        {course.grade_range}
                                                                                </span>
                                                                        </div>

                                                                        <h2 className='text-lg font-semibold text-slate-900'>
                                                                                {course.title}
                                                                        </h2>

                                                                        <p className='line-clamp-2 text-sm text-slate-600'>
                                                                                {course.description ||
                                                                                        '간단한 소개가 준비 중입니다.'}
                                                                        </p>
                                                                </div>
                                                        </article>
                                                );

                                                if (course.is_closed) {
                                                        return (
                                                                <div
                                                                        key={course.id}
                                                                        className='cursor-not-allowed'
                                                                        aria-disabled>
                                                                        {card}
                                                                </div>
                                                        );
                                                }

                                                return (
                                                        <Link
                                                                key={course.id}
                                                                href={`/classes/${course.id}`}
                                                                className='block'>
                                                                {card}
                                                        </Link>
                                                );
                                        })}
                                </div>
                        )}
                </div>
	);
}
