'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
        deleteCourse,
        reorderCourses,
        updateCourseClosed,
} from '@/app/actions/admin';
import type { ICourse } from '@/app/(dashboard)/admin/courses/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CourseListProps = {
	courses: ICourse[];
};

type StatusMessage = {
	type: 'success' | 'error';
	message: string;
};

function moveItem(list: ICourse[], fromId: string, toId: string) {
	const updated = [...list];
	const fromIndex = updated.findIndex((course) => course.id === fromId);
	const toIndex = updated.findIndex((course) => course.id === toId);

	if (fromIndex === -1 || toIndex === -1) return list;

	const [item] = updated.splice(fromIndex, 1);
	updated.splice(toIndex, 0, item);
	return updated;
}

export function AdminCourseList({ courses }: CourseListProps) {
        const initialOrderRef = useRef<string[]>(
                courses.map((course) => course.id)
        );
        const router = useRouter();
        const [currentCourses, setCurrentCourses] = useState<ICourse[]>(courses);
        const [draggingId, setDraggingId] = useState<string | null>(null);
        const [hasChanges, setHasChanges] = useState(false);
        const [status, setStatus] = useState<StatusMessage | null>(null);
        const [closingCourseId, setClosingCourseId] = useState<string | null>(null);
        const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
        const [isPending, startTransition] = useTransition();

        const courseCount = currentCourses.length;

        useEffect(() => {
                setCurrentCourses(courses);
                initialOrderRef.current = courses.map((course) => course.id);
                setHasChanges(false);
        }, [courses]);

	const updateOrderState = (updater: (prev: ICourse[]) => ICourse[]) => {
		setCurrentCourses((prev) => {
			const next = updater(prev);
			setHasChanges(
				initialOrderRef.current.join('|') !==
					next.map((course) => course.id).join('|')
			);
			setStatus(null);
			return next;
		});
	};

	const handleDragStart = (courseId: string) => {
		setDraggingId(courseId);
	};

	const handleDragEnter = (courseId: string) => {
		if (!draggingId || draggingId === courseId) return;
		updateOrderState((prev) => moveItem(prev, draggingId, courseId));
	};

	const handleDragEnd = () => {
		setDraggingId(null);
	};

	const moveBy = (courseId: string, delta: number) => {
		updateOrderState((prev) => {
			const index = prev.findIndex((course) => course.id === courseId);
			if (index === -1) return prev;

			const targetIndex = index + delta;
			if (targetIndex < 0 || targetIndex >= prev.length) return prev;

			const updated = [...prev];
			const [item] = updated.splice(index, 1);
			updated.splice(targetIndex, 0, item);
			return updated;
		});
	};

	const handleSave = () => {
		startTransition(async () => {
			const result = await reorderCourses(
				currentCourses.map((course) => course.id)
			);
			if (!result?.success) {
				setStatus({
					type: 'error',
					message:
						result?.error ?? '수업 순서를 저장하지 못했습니다.',
				});
				return;
			}

			initialOrderRef.current = currentCourses.map((course) => course.id);
			setHasChanges(false);
                        setStatus({
                                type: 'success',
                                message: '수업 순서가 저장되었습니다.',
                        });
                });
        };

        const handleDelete = (courseId: string) => {
                const confirmed = confirm('이 수업을 삭제하시겠습니까?');
                if (!confirmed) return;

                setDeletingCourseId(courseId);
                startTransition(async () => {
                        try {
                                await deleteCourse(courseId);
                                setCurrentCourses((prev) =>
                                        prev.filter((course) => course.id !== courseId)
                                );
                                initialOrderRef.current = initialOrderRef.current.filter(
                                        (id) => id !== courseId
                                );
                                setStatus({ type: 'success', message: '수업을 삭제했습니다.' });
                                router.refresh();
                        } catch (error) {
                                console.error(error);
                                setStatus({
                                        type: 'error',
                                        message: '수업을 삭제하지 못했습니다.',
                                });
                        } finally {
                                setDeletingCourseId(null);
                        }
                });
        };

	const handleToggleClosed = (courseId: string, nextClosed: boolean) => {
		setClosingCourseId(courseId);
		startTransition(async () => {
			const result = await updateCourseClosed(courseId, nextClosed);

			if (!result?.success) {
				setStatus({
					type: 'error',
					message:
						result?.error ??
						'신청 마감 상태를 변경하지 못했습니다.',
				});
				setClosingCourseId(null);
				return;
			}

			setCurrentCourses((prev) =>
				prev.map((course) =>
					course.id === courseId
						? { ...course, is_closed: nextClosed }
						: course
				)
			);
			setStatus({
				type: 'success',
				message: nextClosed
					? '수업 신청을 마감했습니다.'
					: '수업 신청을 다시 열었습니다.',
			});
			setClosingCourseId(null);
		});
	};

	if (currentCourses.length === 0) {
		return (
			<p className='text-sm text-slate-600'>등록된 수업이 없습니다.</p>
		);
	}

	return (
		<div className='space-y-3'>
			<div className='flex flex-wrap items-center gap-2 text-sm text-slate-600'>
				<span>카드를 드래그하여 순서를 조정한 뒤 저장하세요.</span>
				<div className='ml-auto flex items-center gap-2'>
					{status && (
						<span
							className={cn(
								'rounded-md border px-3 py-1 text-xs font-semibold',
								status.type === 'success'
									? 'border-green-200 bg-green-50 text-green-700'
									: 'border-red-200 bg-red-50 text-red-700'
							)}>
							{status.message}
						</span>
					)}
					<Button
						type='button'
						size='sm'
						onClick={handleSave}
						disabled={!hasChanges || isPending}>
						{isPending ? '저장 중...' : '순서 저장'}
					</Button>
				</div>
			</div>

			<div className='grid gap-3 md:grid-cols-2'>
				{currentCourses.map((course, index) => (
					<div
						key={course.id}
						draggable={false}
						onDragEnter={(event) => {
							event.preventDefault();
							handleDragEnter(course.id);
						}}
						onDragOver={(event) => event.preventDefault()}
						onDrop={handleDragEnd}
						className={cn(
							'rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3 transition',
							draggingId === course.id &&
								'ring-2 ring-[var(--primary)]'
						)}>
						<div className='flex items-center gap-2'>
							<button
								type='button'
								draggable
								onDragStart={() => handleDragStart(course.id)}
								onDragEnd={handleDragEnd}
								className='md:flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-grab hidden'>
								<svg
									aria-hidden='true'
									className='h-4 w-4 text-slate-500'
									viewBox='0 0 20 20'
									fill='currentColor'>
									<path d='M7 4.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0ZM7 10a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm-9 5.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0Z' />
								</svg>
							</button>
							<span className='text-xs text-slate-500'>
								현재 {index + 1} / {courseCount}
							</span>
							<div className='ml-auto flex gap-1 md:hidden'>
								<Button
									type='button'
									variant='ghost'
									size='sm'
									onClick={() => moveBy(course.id, -1)}
									disabled={index === 0}>
									▲ 위로
								</Button>
								<Button
									type='button'
									variant='ghost'
									size='sm'
									onClick={() => moveBy(course.id, 1)}
									disabled={
										index === currentCourses.length - 1
									}>
									▼ 아래로
								</Button>
							</div>
						</div>

						<Link
							href={`/admin/courses/${course.id}`}
							className='flex gap-3 group'>
							<div className='h-24 w-24 overflow-hidden rounded-md bg-[var(--primary-soft)] border border-[var(--primary-border)]'>
								{course.image_url ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={course.image_url}
										alt={`${course.title} 이미지`}
										className='h-full w-full object-cover transition duration-150 group-hover:scale-105'
									/>
								) : (
									<div className='flex h-full w-full items-center justify-center text-xs font-semibold text-[var(--primary)]'>
										이미지 없음
									</div>
								)}
							</div>
							<div className='flex-1'>
								<div className='flex items-start justify-between gap-2'>
									<div>
										<h3 className='text-base font-semibold text-slate-900 group-hover:text-[var(--primary)]'>
											{course.title}
										</h3>
										<div className='flex items-center gap-1 my-1'>
											<div className='flex flex-wrap gap-2 text-xs'>
												<span className='rounded-full bg-[var(--primary-soft)] px-2 py-1 font-semibold text-[var(--primary)]'>
													{course.weeks}주 과정
												</span>
											</div>
											{course.is_closed && (
												<Badge variant='warning'>
													신청 마감
												</Badge>
											)}
										</div>
										<p className='text-sm text-slate-600'>
											{course.subject} ·{' '}
											{course.grade_range} ·{' '}
											{course.duration_minutes}분 · 정원{' '}
											{course.capacity}
										</p>
										{course.description && (
											<p className='mt-1 max-h-12 overflow-hidden text-xs text-slate-700'>
												{course.description}
											</p>
										)}
									</div>
								</div>
							</div>
						</Link>

						<div className='flex flex-wrap items-center gap-2 text-sm'>
							<Link
								href={`/admin/courses/${course.id}`}
								className='rounded-md border border-[var(--primary-border)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
								상세 보기
							</Link>
							<Link
								href={`/admin/courses/${course.id}/edit`}
								className='rounded-md border border-[var(--primary-border)] px-3 py-2 text-[var(--primary)] hover:bg-[var(--primary-soft)]'>
								수업 수정
							</Link>
                                                <form
                                                        className='ml-auto'>
                                                        <Button
                                                                type='button'
                                                                variant='ghost'
                                                                className='text-red-600'
                                                                onClick={() => handleDelete(course.id)}
                                                                disabled={
                                                                        deletingCourseId === course.id ||
                                                                        isPending
                                                                }>
                                                                {deletingCourseId === course.id
                                                                        ? '삭제 중...'
                                                                        : '삭제'}
                                                        </Button>
                                                </form>
							<Button
								type='button'
								variant={
									course.is_closed ? 'outline' : 'secondary'
								}
								onClick={() =>
									handleToggleClosed(
										course.id,
										!course.is_closed
									)
								}
								disabled={
									closingCourseId === course.id || isPending
								}>
								{course.is_closed ? '마감 해제' : '신청 마감'}
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
