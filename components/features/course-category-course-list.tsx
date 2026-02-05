'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CourseCategoryTab } from '@/lib/course-categories';
import {
	COURSE_CATEGORY_TABS,
	normalizeCourseCategory,
} from '@/lib/course-categories';
import { cn } from '@/lib/utils';

export type CourseCard = {
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

type Props = {
	courses: CourseCard[];
};

export function CourseCategoryCourseList({ courses }: Props) {
	const [activeTab, setActiveTab] = useState<CourseCategoryTab>('전체');

	const filteredCourses = useMemo(() => {
		if (activeTab === '전체') return courses;
		return courses.filter(
			(course) => normalizeCourseCategory(course.subject) === activeTab
		);
	}, [activeTab, courses]);

	return (
		<div className='space-y-6'>
			<div className='flex flex-wrap gap-2 rounded-2xl border border-[var(--primary-border)] bg-white p-2'>
				{COURSE_CATEGORY_TABS.map((tab) => (
					<button
						key={tab}
						type='button'
						onClick={() => setActiveTab(tab)}
						className={cn(
							'rounded-full px-4 py-2 text-sm font-semibold transition',
							activeTab === tab
								? 'bg-[var(--primary)] text-white shadow-sm'
								: 'text-slate-600 hover:bg-slate-50'
						)}>
						{tab}
					</button>
				))}
			</div>

			{filteredCourses.length === 0 ? (
				<div className='rounded-2xl border border-[var(--primary-border)] bg-white p-6 text-sm text-slate-700'>
					선택한 종류에 해당하는 수업이 없습니다.
				</div>
			) : (
				<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
					{filteredCourses.map((course) => {
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
