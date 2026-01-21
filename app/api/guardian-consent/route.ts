import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/admin';

const origin =
  typeof window !== "undefined" ? window.location.origin : "https://rinschool.com";

export async function GET(request: Request) {
	const supabase = getSupabaseServiceRoleClient();

	const { searchParams } = new URL(request.url);
	const userId = searchParams.get('user_id');
	const token = searchParams.get('token');

	if (!userId || !token) {
		const url = new URL(
			`${origin}/guardian-consent/error?reason=missing`,
			request.url
		);
		return NextResponse.redirect(url);
	}

	const { data: consent, error: selectError } = await supabase
		.from('user_consents')
		.select('guardian_status')
		.eq('user_id', userId)
		.eq('guardian_token', token)
		.single();

	if (selectError || !consent) {
		if (selectError) {
			console.error({ selectError });
		}
		if (!consent) {
			console.error('no consent!');
		}

		const url = new URL(
			`${origin}/guardian-consent/error?reason=invalid`,
			request.url
		);
		return NextResponse.redirect(url);
	}

	if (consent.guardian_status === 'confirmed') {
		const url = new URL(`${origin}/guardian-consent/already-confirmed`, request.url);
		return NextResponse.redirect(url);
	}

	const { error: updateError } = await supabase
		.from('user_consents')
		.update({
			guardian_status: 'confirmed',
			guardian_confirmed_at: new Date().toISOString(),
		})
		.eq('user_id', userId)
		.eq('guardian_token', token);

	if (updateError) {
		console.error({ updateError });

		const url = new URL(
			`${origin}/guardian-consent/error?reason=update_failed`,
			request.url
		);
		return NextResponse.redirect(url);
	}
	const url = new URL(`${origin}/guardian-consent/success`, request.url);
	return NextResponse.redirect(url);
}
