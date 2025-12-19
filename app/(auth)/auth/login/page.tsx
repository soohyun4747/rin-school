'use client';

import { useState } from 'react';
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
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const supabase = getSupabaseBrowserClient();
		setError(null);
		const { data, error: signInError } =
			await supabase.auth.signInWithPassword({ email, password });
		if (signInError) {
			setError(signInError.message);
			return;
		}
    console.log(data);
    
		if (data.user.user_metadata.role === 'admin') {
			router.push('/admin/courses');
		}
		if (data.user.user_metadata.role === 'student') {
			router.push('/student/applications');
		}
		if (data.user.user_metadata.role === 'instructor') {
			router.push('/instructor/timetable');
		}
	};

	return (
		<div className='flex min-h-[70vh] items-center justify-center bg-slate-50 py-12'>
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
