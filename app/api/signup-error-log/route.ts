import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			context?: string;
			email?: string;
			username?: string;
			error_message?: string;
			error_code?: string;
			error_payload?: unknown;
		};

		const errorMessage = String(body.error_message ?? '').trim();
		if (!errorMessage) {
			return NextResponse.json(
				{ error: 'error_message is required' },
				{ status: 400 },
			);
		}

		const adminClient = getSupabaseServiceRoleClient();
		const { error } = await adminClient.from('signup_error_logs').insert({
			context: String(body.context ?? 'signup_handle_submit'),
			email: body.email ? String(body.email).trim() : null,
			username: body.username ? String(body.username).trim() : null,
			error_message: errorMessage,
			error_code: body.error_code ? String(body.error_code) : null,
			error_payload: body.error_payload ?? null,
		});

		if (error) {
			console.error('signup error log insert failed:', error);
			return NextResponse.json(
				{ error: 'failed to persist signup error' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error('signup error log api failed:', error);
		return NextResponse.json({ error: 'invalid request' }, { status: 400 });
	}
}
