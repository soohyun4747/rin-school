'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [needsConfirmation, setNeedsConfirmation] = useState(false);
	const [resendMessage, setResendMessage] = useState<string | null>(null);
	const [isResending, setIsResending] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const supabase = getSupabaseBrowserClient();
		setError(null);
		setNeedsConfirmation(false);
		setResendMessage(null);
		const { data, error: signInError } =
			await supabase.auth.signInWithPassword({ email, password });
		if (signInError) {
			setError(signInError.message);
			if (signInError.message.toLowerCase().includes('confirm')) {
				setNeedsConfirmation(true);
			}
			return;
		}
		const userMetaData = data.user.user_metadata;

		const { data: consentData } = await supabase
			.from('user_consents')
			.select('age_confirmed, guardian_status')
			.eq('user_id', userMetaData.id);

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
		if (!email) {
			setError('확인 메일을 보내기 위해 이메일을 입력해주세요.');
			return;
		}

		const supabase = getSupabaseBrowserClient();
		setIsResending(true);
		setResendMessage(null);

		const { error: resendError } = await supabase.auth.resend({
			type: 'signup',
			email,
		});

		if (resendError) {
			setResendMessage(resendError.message);
		} else {
			setResendMessage(
				'확인 이메일을 다시 보냈습니다. 받은 편지함을 확인해주세요.'
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
								이메일
							</label>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								type='email'
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
