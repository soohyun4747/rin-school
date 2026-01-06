'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CourseUpdateResult } from '@/app/actions/admin';
import { updateCourse } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { EditableTimeWindow, InstructorOption } from './course-form-types';
import { CourseScheduleFields } from './course-schedule-fields';

interface Props {
	course: {
		id: string;
		title: string;
		subject: string;
		grade_range: string;
		description: string | null;
		capacity: number;
		duration_minutes: number;
		weeks: number;
		image_url: string | null;
	};
	instructors: InstructorOption[];
	windows: EditableTimeWindow[];
}

export function CourseEditForm({ course, instructors, windows }: Props) {
	const router = useRouter();
	const initialState: CourseUpdateResult = {
		success: false,
		error: undefined,
	};
	const [state, formAction, isPending] = useActionState(
		updateCourse.bind(null, course.id),
		initialState
	);

	useEffect(() => {
		if (state?.success) {
			router.push(`/admin/courses/${course.id}`);
		}
	}, [state?.success, course.id, router]);

	useEffect(() => {
		if (state.error) {
			alert(state.error);
		}
	}, [state.error]);

	return (
		<div className='space-y-4'>
			<form
				action={formAction}
				className='grid grid-cols-1 gap-3 md:grid-cols-2'>
				<input
					type='hidden'
					name='current_image_url'
					value={course.image_url ?? ''}
				/>

				<Card className='md:col-span-2'>
					<CardHeader>
						<CardTitle>기본 정보</CardTitle>
					</CardHeader>
					<CardContent className='grid grid-cols-1 gap-3 md:grid-cols-2'>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								수업명
							</label>
							<Input
								name='title'
								defaultValue={course.title}
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								과목
							</label>
							<Input
								name='subject'
								defaultValue={course.subject}
								required
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-700'>
								학년 범위
							</label>
							<Input
								name='grade_range'
								defaultValue={course.grade_range}
								required
							/>
						</div>
						<div className='grid grid-cols-2 gap-2'>
							<div>
								<label className='text-sm font-medium text-slate-700'>
									정원
								</label>
								<Input
									name='capacity'
									type='number'
									min={1}
									defaultValue={course.capacity}
									required
								/>
							</div>
							<div>
								<label className='text-sm font-medium text-slate-700'>
									수업 시간(분)
								</label>
								<Select
									name='duration_minutes'
									defaultValue={course.duration_minutes.toString()}>
									<option value='60'>60분</option>
									<option value='90'>90분</option>
								</Select>
							</div>
						</div>
						<div className='md:col-span-2'>
							<label className='text-sm font-medium text-slate-700'>
								수업 소개
							</label>
							<textarea
								name='description'
								rows={3}
								defaultValue={course.description ?? ''}
								placeholder='수업 목표, 수업 방식 등 간단한 소개를 적어주세요.'
								className='w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-[var(--primary)]'
							/>
							<p className='mt-1 text-xs text-slate-500'>
								수업 목록과 학생 페이지에 표시됩니다.
							</p>
						</div>
					</CardContent>
				</Card>

				<CourseScheduleFields
					instructors={instructors}
					initialWeeks={course.weeks}
					initialWindows={windows}
				/>

				<Card className='md:col-span-2'>
					<CardHeader>
						<CardTitle>이미지</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2'>
						<label className='text-sm font-medium text-slate-700'>
							대표 이미지 (선택)
						</label>
						<Input
							name='image'
							type='file'
							accept='image/*'
						/>
						{course.image_url && (
							<p className='text-xs text-slate-600'>
								현재 이미지가 유지됩니다. 새 이미지를 업로드하면
								교체됩니다.
							</p>
						)}
						{!course.image_url && (
							<p className='text-xs text-slate-500'>
								수업 소개에 사용됩니다. (JPG, PNG 등 이미지
								파일)
							</p>
						)}
					</CardContent>
				</Card>

				{state?.error && (
					<div className='md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100'>
						{state.error}
					</div>
				)}

				<div className='md:col-span-2 flex items-center justify-end gap-2'>
					<Button
						type='button'
						variant='secondary'
						onClick={() =>
							router.push(`/admin/courses/${course.id}`)
						}>
						취소
					</Button>
					<Button
						type='submit'
						disabled={isPending}>
						{isPending ? '수정 중...' : '수정 완료'}
					</Button>
				</div>
			</form>

			<div className='rounded-md border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700'>
				시간 정보를 수정하면 기존 슬롯과 신청 시간 선택이 초기화될 수
				있습니다. 수정 전 확인해주세요.
			</div>
		</div>
	);
}
