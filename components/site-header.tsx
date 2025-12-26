import type { Role } from '@/lib/auth';
import type { Tables } from '@/types/database';
import { getSessionAndProfile } from '@/lib/auth';
import { SiteHeaderClient } from './site-header-client';

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
                        { href: '/instructor/timetable', label: '시간표' },
                ],
        };

        const roleMenu = profile ? menuByRole[profile.role] : [];
        const isLoggedIn = Boolean(profile);

        return (
                <SiteHeaderClient
                        roleMenu={roleMenu}
                        isLoggedIn={isLoggedIn}
                        profileRole={profile?.role ?? null}
                />
        );
}
