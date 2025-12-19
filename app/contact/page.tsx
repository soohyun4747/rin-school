import Link from 'next/link';

const contactPoints = [
	{
		title: '이메일',
		value: 'hello@leanschool.kr',
		href: 'mailto:hello@leanschool.kr',
	},
	{
		title: '전화',
		value: '02-123-4567',
		href: 'tel:+8221234567',
	},
	{
		title: '운영 시간',
		value: '평일 10:00 - 18:00',
	},
];

export default function ContactPage() {
	return (
		<div className='mx-auto max-w-5xl px-4 py-12 space-y-10'>
			<div className='space-y-3'>
				<p className='text-sm font-semibold uppercase tracking-wide text-[var(--primary)]'>
					contact
				</p>
				<h1 className='text-3xl font-bold text-slate-900 md:text-4xl'>
					린스쿨 팀에 문의하기
				</h1>
				<p className='text-base text-slate-600'>
					수업 소개, 매칭 방법, 도입 일정 등 궁금한 내용을 남겨주시면
					빠르게 연락드리겠습니다.
				</p>
			</div>

			<div className='grid gap-6 md:grid-cols-[1.2fr_0.8fr]'>
				<div className='rounded-2xl border border-[var(--primary-border)] bg-white p-6 shadow-sm'>
					<h2 className='text-lg font-semibold text-slate-900'>
						문의 폼
					</h2>
					<p className='text-sm text-slate-600'>
						아래 정보를 작성해 주세요. 담당자가 확인 후
						연락드립니다.
					</p>
					<form className='mt-6 grid gap-4'>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-slate-700'>
								성함
							</label>
							<input
								name='name'
								className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]'
								placeholder='이름을 입력하세요'
								required
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-slate-700'>
								이메일
							</label>
							<input
								name='email'
								type='email'
								className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]'
								placeholder='contact@example.com'
								required
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-slate-700'>
								문의 내용
							</label>
							<textarea
								name='message'
								rows={4}
								className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]'
								placeholder='필요한 수업, 도입 일정, 예산 등을 알려주세요.'
								required
							/>
						</div>
						<button
							type='submit'
							className='inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)]'>
							문의 남기기
						</button>
						<p className='text-xs text-slate-500'>
							현재 MVP 환경에서는 메일로 별도 안내를 드립니다.
						</p>
					</form>
				</div>

				<div className='space-y-4'>
					<div className='rounded-2xl border border-[var(--primary-border)] bg-white p-6 shadow-sm'>
						<h3 className='text-lg font-semibold text-slate-900'>
							연락처
						</h3>
						<p className='text-sm text-slate-600'>
							편한 방법으로 연락 주세요.
						</p>
						<div className='mt-4 space-y-3'>
							{contactPoints.map((item) => (
								<div
									key={item.title}
									className='rounded-lg border border-slate-100 bg-slate-50 px-4 py-3'>
									<p className='text-xs font-semibold uppercase tracking-wide text-[var(--primary)]'>
										{item.title}
									</p>
									{item.href ? (
										<Link
											href={item.href}
											className='text-sm font-medium text-slate-900 hover:text-[var(--primary)]'>
											{item.value}
										</Link>
									) : (
										<p className='text-sm font-medium text-slate-900'>
											{item.value}
										</p>
									)}
								</div>
							))}
						</div>
					</div>
					<div className='rounded-2xl border border-[var(--primary-border)] bg-white p-6 shadow-sm'>
						<h3 className='text-lg font-semibold text-slate-900'>
							바로가기
						</h3>
						<div className='mt-4 flex flex-col gap-3'>
							<Link
								href='/'
								className='text-sm text-[var(--primary)] hover:underline'>
								랜딩 페이지로 돌아가기
							</Link>
							<Link
								href='/auth/login'
								className='text-sm text-[var(--primary)] hover:underline'>
								로그인 페이지 열기
							</Link>
							<Link
								href='/classes'
								className='text-sm text-[var(--primary)] hover:underline'>
								수업 살펴보기
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
