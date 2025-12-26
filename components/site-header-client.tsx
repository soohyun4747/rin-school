'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Role } from '@/lib/auth';
import { logout } from '@/app/actions/auth';

type MenuItem = { href: string; label: string };

type SiteHeaderClientProps = {
        roleMenu: MenuItem[];
        isLoggedIn: boolean;
        profileRole: Role | null;
};

export function SiteHeaderClient({ roleMenu, isLoggedIn, profileRole }: SiteHeaderClientProps) {
        const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

        const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
        const closeMobileMenu = () => setIsMobileMenuOpen(false);

        const mainLinks: MenuItem[] = [
                { href: '/', label: '홈' },
                { href: '/classes', label: '수업' },
        ];

        return (
                <header className='sticky top-0 z-40 border-b bg-white/90 backdrop-blur'>
                        <div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4'>
                                <div className='flex flex-1 items-center gap-6'>
                                        <Link
                                                href='/'
                                                className='flex items-center gap-2 text-xl font-bold text-[var(--primary)]'
                                                onClick={closeMobileMenu}>
                                                <span className='flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--primary-soft)] bg-white shadow-sm'>
                                                        <Image
                                                                src='/logo.png'
                                                                alt='린스쿨 로고'
                                                                width={40}
                                                                height={40}
                                                                className='h-full w-full object-contain'
                                                                priority
                                                        />
                                                </span>
                                                <span className='hidden sm:inline'>린스쿨</span>
                                        </Link>
                                        <nav className='hidden flex-wrap items-center gap-3 text-sm font-medium text-slate-700 md:flex'>
                                                {mainLinks.map((item) => (
                                                        <Link
                                                                key={item.href}
                                                                href={item.href}
                                                                className='rounded-md px-2 py-1 hover:text-[var(--primary)]'>
                                                                {item.label}
                                                        </Link>
                                                ))}
                                                {!isLoggedIn && (
                                                        <Link
                                                                href='/auth/login'
                                                                className='rounded-md px-2 py-1 hover:text-[var(--primary)]'>
                                                                로그인
                                                        </Link>
                                                )}
                                                {roleMenu.map((item) => (
                                                        <Link
                                                                key={item.href}
                                                                href={item.href}
                                                                className='rounded-md px-3 py-1.5 text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
                                                                {item.label}
                                                        </Link>
                                                ))}
                                        </nav>
                                </div>
                                <div className='hidden flex-1 items-center justify-end gap-3 text-sm text-slate-700 md:flex'>
                                        {isLoggedIn && (
                                                <Link
                                                        href='/profile'
                                                        className='rounded-md px-3 py-1.5 text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
                                                        프로필
                                                </Link>
                                        )}
                                        {isLoggedIn && profileRole && (
                                                <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600'>
                                                        {profileRole}
                                                </span>
                                        )}
                                        {isLoggedIn ? (
                                                <form action={logout}>
                                                        <button type='submit' className='text-[var(--primary)] hover:underline'>
                                                                로그아웃
                                                        </button>
                                                </form>
                                        ) : (
                                                <Link href='/auth/signup' className='text-[var(--primary)] hover:underline'>
                                                        회원가입
                                                </Link>
                                        )}
                                </div>
                                <button
                                        type='button'
                                        className='inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50 md:hidden'
                                        aria-expanded={isMobileMenuOpen}
                                        aria-label='메뉴 열기'
                                        onClick={toggleMobileMenu}>
                                        <span className='sr-only'>메뉴</span>
                                        <svg
                                                xmlns='http://www.w3.org/2000/svg'
                                                fill='none'
                                                viewBox='0 0 24 24'
                                                strokeWidth='1.5'
                                                stroke='currentColor'
                                                className='h-5 w-5'>
                                                {isMobileMenuOpen ? (
                                                        <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
                                                ) : (
                                                        <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5m-16.5 5h16.5m-16.5 5h16.5' />
                                                )}
                                        </svg>
                                </button>
                        </div>
                        {isMobileMenuOpen && (
                                <div className='border-t bg-white md:hidden'>
                                        <nav className='flex flex-col gap-1 px-4 py-3 text-sm font-medium text-slate-700'>
                                                {mainLinks.map((item) => (
                                                        <Link
                                                                key={item.href}
                                                                href={item.href}
                                                                className='rounded-md px-2 py-2 hover:bg-[var(--primary-soft)]'
                                                                onClick={closeMobileMenu}>
                                                                {item.label}
                                                        </Link>
                                                ))}
                                                {!isLoggedIn && (
                                                        <Link
                                                                href='/auth/login'
                                                                className='rounded-md px-2 py-2 hover:bg-[var(--primary-soft)]'
                                                                onClick={closeMobileMenu}>
                                                                로그인
                                                        </Link>
                                                )}
                                                {roleMenu.map((item) => (
                                                        <Link
                                                                key={item.href}
                                                                href={item.href}
                                                                className='rounded-md px-2 py-2 text-[var(--primary)] hover:bg-[var(--primary-soft)]'
                                                                onClick={closeMobileMenu}>
                                                                {item.label}
                                                        </Link>
                                                ))}
                                        </nav>
                                        <div className='flex flex-col gap-2 border-t px-4 py-3 text-sm text-slate-700'>
                                                {isLoggedIn && (
                                                        <Link
                                                                href='/profile'
                                                                className='rounded-md px-2 py-2 hover:bg-[var(--primary-soft)]'
                                                                onClick={closeMobileMenu}>
                                                                프로필
                                                        </Link>
                                                )}
                                                {isLoggedIn && profileRole && (
                                                        <span className='w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600'>
                                                                {profileRole}
                                                        </span>
                                                )}
                                                {isLoggedIn ? (
                                                        <form action={logout}>
                                                                <button
                                                                        type='submit'
                                                                        className='rounded-md px-2 py-2 text-left text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
                                                                        로그아웃
                                                                </button>
                                                        </form>
                                                ) : (
                                                        <Link
                                                                href='/auth/signup'
                                                                className='rounded-md px-2 py-2 text-[var(--primary)] hover:bg-[var(--primary-soft)]'
                                                                onClick={closeMobileMenu}>
                                                                회원가입
                                                        </Link>
                                                )}
                                        </div>
                                </div>
                        )}
                </header>
        );
}
