'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { LandingImage } from '@/lib/landing';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { Button } from '@/components/ui/button';

type LandingVariant = 'desktop' | 'mobile';

type Props = {
	title: string;
	variant: LandingVariant;
	images: LandingImage[];
	emptyMessage: string;
	reorderAction: (formData: FormData) => Promise<void>;
	deleteAction: (formData: FormData) => Promise<void>;
};

function reorderArray<T>(items: T[], fromIndex: number, toIndex: number) {
	const copied = [...items];
	const [moved] = copied.splice(fromIndex, 1);
	copied.splice(toIndex, 0, moved);
	return copied;
}

export function AdminLandingImageManager({
	title,
	variant,
	images,
	emptyMessage,
	reorderAction,
	deleteAction,
}: Props) {
	const [orderedImages, setOrderedImages] = useState(images);
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

	useEffect(() => {
		setOrderedImages(images);
	}, [images]);

	const initialPathOrder = useMemo(
		() => images.map((item) => item.path).join('|'),
		[images],
	);
	const currentPathOrder = useMemo(
		() => orderedImages.map((item) => item.path).join('|'),
		[orderedImages],
	);
	const hasOrderChanged = initialPathOrder !== currentPathOrder;

	const handleDrop = (targetIndex: number) => {
		if (draggingIndex === null || draggingIndex === targetIndex) {
			setDraggingIndex(null);
			return;
		}

		setOrderedImages((prev) =>
			reorderArray(prev, draggingIndex, targetIndex),
		);
		setDraggingIndex(null);
	};

	return (
		<div className='space-y-3 rounded-2xl border border-[var(--primary-border)] bg-white p-4 shadow-sm'>
			<h2 className='text-lg font-semibold text-slate-900'>{title}</h2>
			{orderedImages.length > 0 ? (
				<>
					<p className='text-xs text-slate-500'>
						카드를 드래그해서 노출 순서를 변경한 후, 순서 저장
						버튼을 눌러주세요.
					</p>
					<form
						action={reorderAction}
						className='space-y-2'>
						<input
							type='hidden'
							name='variant'
							value={variant}
						/>
						<input
							type='hidden'
							name='orderedPaths'
							value={JSON.stringify(
								orderedImages.map((image) => image.path),
							)}
						/>
						<Button
							type='submit'
							size='sm'
							disabled={!hasOrderChanged}>
							순서 저장
						</Button>
					</form>
					<div className='space-y-4'>
						{orderedImages.map((image, index) => (
							<div
								key={image.path}
								draggable
								onDragStart={() => setDraggingIndex(index)}
								onDragOver={(e) => e.preventDefault()}
								onDrop={() => handleDrop(index)}
								onDragEnd={() => setDraggingIndex(null)}
								className='space-y-2 rounded-xl border border-slate-200 p-3'>
								<div className='flex items-center gap-2'>
									<button
										type='button'
										className='md:flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-grab hidden'>
										<svg
											aria-hidden='true'
											className='h-4 w-4 text-slate-500'
											viewBox='0 0 20 20'
											fill='currentColor'>
											<path d='M7 4.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0ZM7 10a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm-9 5.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Z' />
										</svg>
									</button>
									<p className='text-xs font-medium text-slate-500'>
										순서 {index + 1}
									</p>
								</div>
								<div className='relative h-48 overflow-hidden rounded-lg border bg-slate-100 md:h-64'>
									<Image
										src={image.publicUrl}
										alt={`랜딩 이미지 (${variant === 'desktop' ? '데스크톱' : '모바일'}) ${index + 1}`}
										fill
										className='object-cover'
										sizes='(min-width: 1024px) 720px, 100vw'
									/>
								</div>
								<p className='text-xs break-all text-slate-600'>
									링크: {image.linkUrl ?? '설정 안 함'}
								</p>
								<form action={deleteAction}>
									<input
										type='hidden'
										name='variant'
										value={variant}
									/>
									<input
										type='hidden'
										name='path'
										value={image.path}
									/>
									<ConfirmSubmitButton
										message='이 랜딩 이미지를 삭제하시겠습니까?'
										variant='danger'
										size='sm'>
										이미지 삭제
									</ConfirmSubmitButton>
								</form>
							</div>
						))}
					</div>
				</>
			) : (
				<p className='text-sm text-slate-600'>{emptyMessage}</p>
			)}
		</div>
	);
}
