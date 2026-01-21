'use client';

import { startTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [needsConfirmation, setNeedsConfirmation] = useState(false);
	const [resendMessage, setResendMessage] = useState<string | null>(null);
	const [isResending, setIsResending] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const confirmationMessage =
		searchParams.get('type') === 'signup'
			? '이메일 인증이 완료되었습니다. 로그인해주세요.'
			: null;

	const resolveEmail = async (
		supabase: ReturnType<typeof getSupabaseBrowserClient>,
	) => {
		const trimmed = identifier.trim();
		if (!trimmed) {
			throw new Error('아이디 또는 이메일을 입력해주세요.');
		}

		if (trimmed.includes('@')) {
			return trimmed;
		}

		const { data, error: profileError } = await supabase
			.from('profiles')
			.select('email')
			.eq('username', trimmed)
			.maybeSingle();

		if (profileError) {
			console.error(profileError);
			throw new Error('로그인 중 오류가 발생했습니다.');
		}

		if (!data?.email) {
			throw new Error('해당 아이디로 등록된 이메일을 찾을 수 없습니다.');
		}

		return data.email;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const supabase = getSupabaseBrowserClient();
		setError(null);
		setNeedsConfirmation(false);
		setResendMessage(null);

		let emailForLogin: string;

		try {
			emailForLogin = await resolveEmail(supabase);
		} catch (resolveError) {
			setError(
				resolveError instanceof Error
					? resolveError.message
					: '로그인에 실패했습니다.',
			);
			return;
		}

		const { data, error: signInError } =
			await supabase.auth.signInWithPassword({
				email: emailForLogin,
				password,
			});
		if (signInError) {
			setError(signInError.message);
			if (signInError.message.toLowerCase().includes('confirm')) {
				setNeedsConfirmation(true);
			}
			return;
		}

		const userData = data.user;
		const userMetaData = data.user.user_metadata;

		const { data: consentData } = await supabase
			.from('user_consents')
			.select('age_confirmed, guardian_status')
			.eq('user_id', userData.id)
			.maybeSingle();

		if (
			consentData &&
			!consentData.age_confirmed &&
			consentData.guardian_status !== 'confirmed'
		) {
			setError('보호자 동의 완료가 필요합니다.');
			return;
		}

		const role = userMetaData.role;

		const target =
			role === 'admin'
				? '/admin/courses'
				: role === 'student'
					? '/student/applications'
					: '/instructor/timetable';

		// ✅ 핵심: push 후 refresh (또는 refresh 후 push도 가능)
		startTransition(() => {
			router.push(target);
			router.refresh();
		});
	};

	const handleResendConfirmation = async () => {
		if (!identifier.trim()) {
			setError(
				'확인 메일을 보내기 위해 아이디 또는 이메일을 입력해주세요.',
			);
			return;
		}

		const supabase = getSupabaseBrowserClient();
		setIsResending(true);
		setResendMessage(null);

		try {
			const resolvedEmail = await resolveEmail(supabase);

			const { error: resendError } = await supabase.auth.resend({
				type: 'signup',
				email: resolvedEmail,
			});

			if (resendError) {
				setResendMessage(resendError.message);
			} else {
				setResendMessage(
					'확인 이메일을 다시 보냈습니다. 받은 편지함을 확인해주세요.',
				);
			}
		} catch (resolveError) {
			setError(
				resolveError instanceof Error
					? resolveError.message
					: '이메일 확인 중 오류가 발생했습니다.',
			);
		}

		setIsResending(false);
	};

	return (
		<div className='flex flex-1 items-center justify-center bg-slate-50 py-12 min-h-[77vh]'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle>로그인</CardTitle>
					<p className='text-sm text-slate-600'>
						린스쿨 계정으로 로그인하세요.
					</p>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={handleSubmit}
						className='space-y-3'>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								아이디 또는 이메일
							</label>
							<Input
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								type='text'
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								비밀번호
							</label>
							<Input
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								type='password'
								required
								autoComplete='new-password'
							/>
						</div>
						{confirmationMessage && (
							<div className='rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800'>
								{confirmationMessage}
							</div>
						)}
						{error && (
							<p className='text-sm text-red-600'>{error}</p>
						)}
						{needsConfirmation && (
							<div className='space-y-2 rounded-md bg-slate-50 p-3'>
								<div className='flex items-center justify-between'>
									<p className='text-sm text-slate-700'>
										이메일 인증이 필요합니다.
									</p>
									<Button
										type='button'
										variant='secondary'
										size='sm'
										disabled={isResending}
										onClick={handleResendConfirmation}>
										{isResending
											? '재전송 중...'
											: '확인 이메일 다시 보내기'}
									</Button>
								</div>
								{resendMessage && (
									<p className='text-xs text-slate-600'>
										{resendMessage}
									</p>
								)}
							</div>
						)}
						<Button
							type='submit'
							className='w-full'>
							로그인
						</Button>
					</form>
					<p className='mt-4 text-sm text-slate-600'>
						계정이 없나요?{' '}
						<Link
							href='/auth/signup'
							className='text-[var(--primary)] hover:underline'>
							회원가입
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
