import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database';

export type Role = Tables<'profiles'>['role'];

export async function getSessionAndProfile() {
	const supabase = await getSupabaseServerClient();

	// ✅ 서버에서 "진짜 인증된 유저" 확인
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		return { session: null, profile: null } as const;
	}

        const { data: profile } = await supabase
                .from('profiles')
                .select('id, role, username, name, phone, email, birthdate, kakao_id, country, guardian_name')
                .eq('id', user.id)
                .single();

	// session은 굳이 필요 없으면 null로 두셔도 됩니다.
	// (원하면 아래처럼 getSession()을 "참고용"으로만 같이 받아도 되지만,
	//  인증판단은 반드시 getUser()로 하세요.)
	const {
		data: { session },
	} = await supabase.auth.getSession();

	return { session, profile } as const;
}

export async function requireSession() {
	const { session, profile } = await getSessionAndProfile();

	if (!session || !profile) {
		redirect('/auth/login');
	}

	return { session, profile } as const;
}

export function requireRole(profileRole: Role, allowed: Role[]) {
	if (!allowed.includes(profileRole)) {
		redirect('/auth/login');
	}
}
