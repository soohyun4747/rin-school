import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database';

export type Role = Tables<'profiles'>['role'];

const origin =
  typeof window !== "undefined" ? window.location.origin : "https://rinschool.com";

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

	const { data: profile, error } = await supabase
		.from('profiles')
		.select(
			'id, role, username, name, phone, email, birthdate, kakao_id, country, guardian_name'
		)
		.eq('id', user.id)
		.single();

	if (error) {
		console.error({ error });
	}

	const {
		data: { session },
	} = await supabase.auth.getSession();

	return { session, profile } as const;
}

export async function requireSession() {
	const { session, profile } = await getSessionAndProfile();

	if (!session || !profile) {
		redirect(`${origin}/auth/login`);
	}

	return { session, profile } as const;
}

export function requireRole(profileRole: Role, allowed: Role[]) {
	if (!allowed.includes(profileRole)) {
		redirect(`${origin}/auth/login`);
	}
}
