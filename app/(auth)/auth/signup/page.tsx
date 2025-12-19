'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const roles = [
	{ value: 'student', label: '학생' },
	{ value: 'instructor', label: '강사' },
	{ value: 'admin', label: '관리자' },
];

export default function SignupPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [birthdate, setBirthdate] = useState('');
	const [kakaoId, setKakaoId] = useState('');
	const [country, setCountry] = useState('');
	const [role, setRole] = useState('student');
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const supabase = getSupabaseBrowserClient();
		setError(null);
		setMessage(null);
		const trimmedPhone = phone.trim();

		if (password !== confirmPassword) {
			setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
			return;
		}

		const { data: signUpData, error: signUpError } =
			await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						role,
						name,
						phone: trimmedPhone,
						birthdate: birthdate || null,
						kakao_id: kakaoId || null,
						country: country || null,
					},
				},
			});

		if (signUpError) {
			console.error({signUpError});
			setError(signUpError.message);
			return;
		}

		const userId = signUpData.user?.id;
		if (userId && signUpData.session) {
			const { error: profileError } = await supabase
				.from('profiles')
				.update({
					phone: trimmedPhone || null,
					name,
					role,
					birthdate: birthdate || null,
					kakao_id: kakaoId || null,
					country: country || null,
					email,
				})
				.eq('id', userId);

			if (profileError) {
				console.error({profileError});
				setError(
					'프로필 정보를 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
				);
				return;
			}
		}
		setMessage('회원가입이 완료되었습니다. 로그인해 주세요.');
		router.push('/auth/login');
	};

	return (
		<div className='flex min-h-[70vh] items-center justify-center bg-slate-50 py-12'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle>회원가입</CardTitle>
					<p className='text-sm text-slate-600'>
						역할과 기본 정보를 입력해주세요.
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
						<div>
							<label className='text-sm font-medium text-slate-700'>
								비밀번호 확인
							</label>
							<Input
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.target.value)
								}
								type='password'
								required
								autoComplete='new-password'
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								이름
							</label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								연락처
							</label>
							<Input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder='010-1234-5678'
								type='tel'
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								생년월일
							</label>
							<Input
								value={birthdate}
								onChange={(e) => setBirthdate(e.target.value)}
								type='date'
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								카카오톡 ID (선택)
							</label>
							<Input
								value={kakaoId}
								onChange={(e) => setKakaoId(e.target.value)}
								placeholder='kakao_example'
								autoComplete='new-password'
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								거주 국가
							</label>
							<Input
								value={country}
								onChange={(e) => setCountry(e.target.value)}
								placeholder='대한민국'
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								역할
							</label>
							<select
								value={role}
								onChange={(e) => setRole(e.target.value)}
								className='w-full rounded-md border border-slate-200 px-3 py-2'>
								{roles.map((r) => (
									<option
										key={r.value}
										value={r.value}>
										{r.label}
									</option>
								))}
							</select>
						</div>
						{error && (
							<p className='text-sm text-red-600'>{error}</p>
						)}
						{message && (
							<p className='text-sm text-green-700'>{message}</p>
						)}
						<Button
							type='submit'
							className='w-full'>
							회원가입
						</Button>
					</form>
					<p className='mt-4 text-sm text-slate-600'>
						이미 계정이 있나요?{' '}
						<Link
							href='/auth/login'
							className='text-[var(--primary)] hover:underline'>
							로그인
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
