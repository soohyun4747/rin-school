import Image from 'next/image';
import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className='border-t bg-white'>
      <div className='mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between'>
        <div className='flex items-center gap-3'>
          <span className='flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-[var(--primary-soft)] bg-white shadow-sm'>
            <Image
              src='/logo.png'
              alt='린스쿨 로고'
              width={48}
              height={48}
              className='h-full w-full object-contain'
            />
          </span>
          <div>
            <p className='font-semibold text-slate-800'>린스쿨</p>
            <p className='text-slate-500'>글로벌 온라인 수업</p>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-4'>
          <Link href='/contact' className='text-[var(--primary)] hover:underline'>
            문의하기
          </Link>
          <Link href='/auth/login' className='hover:text-[var(--primary)]'>
            로그인
          </Link>
          <Link href='/classes' className='hover:text-[var(--primary)]'>
            수업 보기
          </Link>
        </div>
      </div>
    </footer>
  );
}
