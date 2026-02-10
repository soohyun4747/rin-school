import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/time';

type StudentProfile = {
	id: string;
	username: string | null;
	name: string;
	email: string;
	phone: string | null;
	birthdate: string | null;
	kakao_id: string | null;
	country: string | null;
	guardian_name: string | null;
	student_course: string | null;
	created_at: string;
};

type SortableField =
	| 'name'
	| 'birthdate'
	| 'country'
	| 'created_at'
	| 'guardian_name';


const formatStudentCourse = (studentCourse: string | null) => {
	switch (studentCourse) {
		case 'international_school':
			return '국제학교';
		case 'local_school':
			return '현지학교';
		case 'homeschool':
			return '홈스쿨';
		default:
			return '미입력';
	}
};

export default async function AdminStudentsPage({
	searchParams,
}: {
	searchParams: Promise<{
		q?: string;
		page?: string;
		sort?: SortableField;
		dir?: string;
	}>;
}) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const {
		q = '',
		page = '1',
		sort = 'created_at',
		dir = 'desc',
	} = (await searchParams) as {
		q?: string | string[];
		page?: string | string[];
		sort?: SortableField | SortableField[];
		dir?: string | string[];
	};
	const searchKeyword = Array.isArray(q) ? q[0] : q;
	const currentPage = Math.max(
		1,
		Number(Array.isArray(page) ? page[0] : page) || 1
	);
	const sortParam = Array.isArray(sort) ? sort[0] : sort;
	const dirParam = Array.isArray(dir) ? dir[0] : dir;
	const pageSize = 20;
	const from = (currentPage - 1) * pageSize;
	const to = from + pageSize - 1;
	const allowedSortFields: SortableField[] = [
		'name',
		'birthdate',
		'country',
		'created_at',
		'guardian_name',
	];
	const sortBy: SortableField = allowedSortFields.includes(
		(sortParam ?? 'created_at') as SortableField
	)
		? ((sortParam as SortableField) ?? 'created_at')
		: 'created_at';
	const sortDirection = dirParam === 'asc' ? 'asc' : 'desc';

	let query = supabase
		.from('profiles')
		.select(
			'id, username, name, email, phone, birthdate, kakao_id, country, guardian_name, student_course, created_at',
			{ count: 'exact' }
		)
		.eq('role', 'student')
		.order(sortBy, { ascending: sortDirection === 'asc' })
		.range(from, to);

	if (searchKeyword) {
		const keyword = `%${searchKeyword}%`;
		query = query.or(
			`name.ilike.${keyword},username.ilike.${keyword},email.ilike.${keyword},phone.ilike.${keyword},kakao_id.ilike.${keyword},country.ilike.${keyword},guardian_name.ilike.${keyword}`
		);
	}

	const { data: students, count, error } = await query;

	if (error) {
		console.error(error);
	}

	const studentRows: StudentProfile[] = students ?? [];
	const totalCount = count ?? studentRows.length;
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const buildPageLink = (pageNumber: number) => {
		const params = new URLSearchParams();
		if (searchKeyword) params.set('q', searchKeyword);
		params.set('page', pageNumber.toString());
		params.set('sort', sortBy);
		params.set('dir', sortDirection);
		return `?${params.toString()}`;
	};

	const buildSortLink = (field: SortableField) => {
		const params = new URLSearchParams();
		if (searchKeyword) params.set('q', searchKeyword);
		params.set('sort', field);
		params.set(
			'dir',
			sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc'
		);
		return `?${params.toString()}`;
	};

	const renderSortLabel = (label: string, field: SortableField) => {
		const isActive = sortBy === field;
		const arrow = !isActive ? '↕' : sortDirection === 'asc' ? '↑' : '↓';
		return (
			<a
				href={buildSortLink(field)}
				className='flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900'>
				<span className='min-w-max'>{label}</span>
				<span className='text-slate-400'>{arrow}</span>
			</a>
		);
	};

	return (
		<div className='space-y-6'>
			<div className='space-y-2'>
				<div className='flex flex-wrap items-start justify-between gap-3'>
					<div>
						<h1 className='text-2xl font-bold text-slate-900'>
							학생 관리
						</h1>
						<p className='text-sm text-slate-600'>
							학생 기본 정보와 연락처를 확인하고 검색할 수 있습니다.
						</p>
					</div>
					<Button aschild='true' variant='outline' className='min-w-max'>
						<Link href='/admin/students/export' prefetch={false}>
							엑셀 다운로드
						</Link>
					</Button>
				</div>
				<form className='flex max-w-md items-center gap-2'>
					<input
						type='text'
						name='q'
						defaultValue={searchKeyword ?? ''}
						placeholder='이름, 아이디, 이메일, 연락처, 카카오톡 ID, 학부모 이름 검색'
						className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
					/>
					<button
						type='submit'
						className='rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white min-w-fit'>
						검색
					</button>
				</form>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>학생 목록</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					{studentRows.length === 0 && (
						<p className='text-sm text-slate-600'>
							등록된 학생이 없습니다.
						</p>
					)}
					{studentRows.length > 0 && (
						<div className='md:overflow-hidden overflow-x-auto rounded-lg border border-slate-200'>
							<table className='min-w-full divide-y divide-slate-200 text-sm'>
								<thead className='bg-slate-50'>
									<tr>
										<th className='px-4 py-2 text-left'>
											{renderSortLabel('이름', 'name')}
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											아이디
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											이메일
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											연락처
										</th>
										<th className='px-4 py-2 text-left'>
											{renderSortLabel(
												'생년월일',
												'birthdate'
											)}
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											카카오톡 ID
										</th>
										<th className='px-4 py-2 text-left'>
											{renderSortLabel(
												'거주지',
												'country'
											)}
										</th>
										<th className='px-4 py-2 text-left'>
											{renderSortLabel(
												'학부모 이름',
												'guardian_name'
											)}
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											재학코스
										</th>
										<th className='px-4 py-2 text-left'>
											{renderSortLabel(
												'가입일',
												'created_at'
											)}
										</th>
										<th className='px-4 py-2 text-left text-xs font-semibold text-slate-600'>
											상세보기
										</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-slate-100 bg-white'>
									{studentRows.map((student) => {
										return (
											<tr
												key={student.id}
												className='hover:bg-slate-50'>
												<td className='px-4 py-2 font-semibold text-slate-900'>
													<Link
														href={`/admin/students/${student.id}`}
														className='hover:underline'>
														{student.name ||
															'이름 미입력'}
													</Link>
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{student.username ||
														'아이디 없음'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{student.email}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{student.phone ||
														'연락처 없음'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{student.birthdate ??
														'미입력'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{student.kakao_id ??
														'미입력'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{student.country ??
														'미입력'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{student.guardian_name ??
														'미입력'}
												</td>
												<td className='px-4 py-2 text-slate-700'>
													{formatStudentCourse(student.student_course)}
												</td>
												<td className='px-4 py-2 text-slate-500'>
													{formatDateTime(
														new Date(
															student.created_at
														)
													)}
												</td>
												<td className='px-4 py-2'>
													<Button
														aschild="true"
														variant='outline'
														size='sm'
														className='min-w-max'>
														<Link
															href={`/admin/students/${student.id}`}>
															상세보기
														</Link>
													</Button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
					{studentRows.length > 0 && (
						<div className='flex items-center justify-between text-sm text-slate-600'>
							<span>
								{currentPage} / {totalPages} 페이지 · 총{' '}
								{totalCount}명
							</span>
							<div className='flex items-center gap-2'>
								<a
									href={buildPageLink(
										Math.max(1, currentPage - 1)
									)}
									className={`rounded-md border px-3 py-1 ${currentPage === 1 ? 'pointer-events-none border-slate-200 text-slate-400' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
									aria-disabled={currentPage === 1}>
									이전
								</a>
								<a
									href={buildPageLink(
										Math.min(totalPages, currentPage + 1)
									)}
									className={`rounded-md border px-3 py-1 ${currentPage >= totalPages ? 'pointer-events-none border-slate-200 text-slate-400' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
									aria-disabled={currentPage >= totalPages}>
									다음
								</a>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
