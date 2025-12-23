'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface BackButtonProps {
	className?: string;
	label?: string;
}

export function BackButton({ className, label = '뒤로 돌아가기' }: BackButtonProps) {
	const router = useRouter();

	return (
		<button
			type='button'
			onClick={() => router.back()}
			className={cn(
				'text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]',
				className
			)}>
			{label}
		</button>
	);
}
