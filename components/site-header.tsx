import Link from 'next/link';
import type { Role } from '@/lib/auth';
import type { Tables } from '@/types/database';
import { getSessionAndProfile } from '@/lib/auth';
import { logout } from '@/app/actions/auth';

export async function SiteHeader() {
	let profile: Tables<'profiles'> | null = null;
	const hasSupabaseEnv =
		process.env.NEXT_PUBLIC_SUPABASE_URL &&
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (hasSupabaseEnv) {
		try {
			const sessionResult = await getSessionAndProfile();
			profile = sessionResult.profile;
		} catch (error) {
			console.error('헤더 세션 확인 실패:', error);
		}
	}

	const menuByRole: Record<Role, { href: string; label: string }[]> = {
		admin: [
			{ href: '/admin/courses', label: '수업 관리' },
			{ href: '/admin/students', label: '학생 관리' },
			{ href: '/admin/instructors', label: '강사 관리' },
      { href: '/admin/landing', label: '랜딩 이미지' },
		],
		student: [
			{ href: '/student/applications', label: '신청 현황' },
			{ href: '/student/timetable', label: '시간표' },
		],
		instructor: [
			{ href: '/instructor/subjects', label: '가능 과목' },
			{ href: '/instructor/availability', label: '가능 시간' },
			{ href: '/instructor/timetable', label: '시간표' },
		],
	};

	const roleMenu = profile ? menuByRole[profile.role] : [];
	const isLoggedIn = Boolean(profile);

	return (
		<header className='sticky top-0 z-40 border-b bg-white/90 backdrop-blur'>
			<div className='mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4'>
				<div className='flex items-center gap-6'>
					<Link
						href='/'
						className='text-xl font-bold text-[var(--primary)]'>
						린스쿨
					</Link>
					<nav className='flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700'>
						<Link
							href='/'
							className='rounded-md px-2 py-1 hover:text-[var(--primary)]'>
							홈
						</Link>
						<Link
							href='/classes'
							className='rounded-md px-2 py-1 hover:text-[var(--primary)]'>
							수업
						</Link>
						{!isLoggedIn && (
							<Link
								href='/auth/login'
								className='rounded-md px-2 py-1 hover:text-[var(--primary)]'>
								로그인
							</Link>
						)}
						{roleMenu.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className='rounded-md px-3 py-1.5 text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
								{item.label}
							</Link>
						))}
					</nav>
				</div>
				<div className='flex flex-1 items-center justify-end gap-3 text-sm text-slate-700'>
					{isLoggedIn && (
						<span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600'>
							{profile.role}
						</span>
					)}
					{isLoggedIn ? (
						<form action={logout}>
							<button
								type='submit'
								className='text-[var(--primary)] hover:underline'>
								로그아웃
							</button>
						</form>
					) : (
						<Link
							href='/auth/signup'
							className='text-[var(--primary)] hover:underline'>
							회원가입
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}
