export const COURSE_CATEGORIES = [
	'수학',
	'영어',
	'국어',
	'코딩',
	'악기',
	'미술',
	'디자인',
	'제2외국어',
	'그 외 과목',
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export const COURSE_CATEGORY_TABS = [...COURSE_CATEGORIES] as const;

export type CourseCategoryTab = (typeof COURSE_CATEGORY_TABS)[number];

const categorySet = new Set<string>(COURSE_CATEGORIES);

export function normalizeCourseCategory(
	subject: string | null | undefined
): CourseCategory {
	if (!subject) {
		return '그 외 과목';
	}
	return categorySet.has(subject) ? (subject as CourseCategory) : '그 외 과목';
}
