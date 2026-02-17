import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database';

export type Role = Tables<'profiles'>['role'];

const origin =
	typeof window !== 'undefined'
		? window.location.origin
		: 'https://rinschool.com';

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
			'id, role, username, name, phone, email, birthdate, kakao_id, country, guardian_name',
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

export function safeUUID() {
	if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
		return window.crypto.randomUUID();
	}

	const bytes = new Uint8Array(16);

	if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
		window.crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 16; i++) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}

	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
		12,
		16,
	)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
