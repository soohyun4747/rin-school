'use client';

import { useId, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { EditableTimeWindow, InstructorOption } from './course-form-types';

const days = ['일', '월', '화', '수', '목', '금', '토'];
const weekOptions = [1, 2, 3, 4, 6, 8, 12];
const weekDaysFromMonday = [1, 2, 3, 4, 5, 6, 0];
const maxDayMinute = 23 * 60 + 59;

interface Props {
	instructors: InstructorOption[];
	durationMinutes: number;
	initialWeeks?: number;
	initialWindows?: EditableTimeWindow[];
}

type TimeWindowField = EditableTimeWindow & { clientId: string };

const formatMinutesToTime = (minutes: number) => {
	const hour = Math.floor(minutes / 60)
		.toString()
		.padStart(2, '0');
	const minute = (minutes % 60).toString().padStart(2, '0');
	return `${hour}:${minute}`;
};

export function CourseScheduleFields({
	instructors,
	durationMinutes,
	initialWeeks,
	initialWindows,
}: Props) {
	const idPrefix = useId();
	const [windows, setWindows] = useState<TimeWindowField[]>(() => [
		...(initialWindows?.length
			? initialWindows.map((window, index) => ({
					clientId: `${idPrefix}-${index}`,
					...window,
				}))
			: [
					{
						clientId: `${idPrefix}-0`,
						day_of_week: 1,
						start_time: '',
						end_time: '',
					},
				]),
	]);

	const windowsPayload = useMemo(
		() =>
			JSON.stringify(
				windows.map(
					({
						day_of_week,
						start_time,
						end_time,
						instructor_id,
						instructor_name,
						id,
					}) => ({
						id,
						day_of_week,
						start_time,
						end_time,
						instructor_id,
						instructor_name,
					})
				)
			),
		[windows]
	);

	const addWindow = () => {
		setWindows((prev) => [
			...prev,
			{
				clientId: `${idPrefix}-${nanoid()}`,
				day_of_week: 1,
				start_time: '',
				end_time: '',
			},
		]);
	};

	const addAllWeekWindows = () => {
		setWindows((prev) => {
			if (!prev.length) return prev;

			const baseWindow = prev[prev.length - 1];

			if (![60, 90].includes(durationMinutes)) {
				alert('수업 시간(분)에서 60분 또는 90분을 선택해주세요.');
				return prev;
			}

			if (prev.length > 0) {
				const ok = confirm(
					'기존 등록된 시간을 모두 삭제하고 월요일부터 일요일까지 전체 시간 슬롯을 추가할까요?'
				);
				if (!ok) return prev;
			}

			const slotsForOneDay: Array<{ start_time: string; end_time: string }> = [];
			for (let slotStart = 0; slotStart + durationMinutes <= maxDayMinute; slotStart += durationMinutes) {
				slotsForOneDay.push({
					start_time: formatMinutesToTime(slotStart),
					end_time: formatMinutesToTime(slotStart + durationMinutes),
				});
			}
			console.log({slotsForOneDay, durationMinutes, maxDayMinute});

			const nextWindows: TimeWindowField[] = weekDaysFromMonday.flatMap((dayOfWeek) =>
				slotsForOneDay.map((slot) => ({
					clientId: `${idPrefix}-${nanoid()}`,
					day_of_week: dayOfWeek,
					start_time: slot.start_time,
					end_time: slot.end_time,
					instructor_id: baseWindow.instructor_id,
					instructor_name: baseWindow.instructor_name,
				}))
			);

			if (!nextWindows.length) {
				alert('입력한 수업 시간 간격으로 생성할 수 있는 슬롯이 없습니다.');
				return prev;
			}

			return nextWindows;
		});
	};

	const updateWindow = (
		clientId: string,
		patch: Partial<TimeWindowField>
	) => {
		setWindows((prev) =>
			prev.map((w) => (w.clientId === clientId ? { ...w, ...patch } : w))
		);
	};

	const removeWindow = (clientId: string) => {
		if (windows.length === 1) return;
		const ok = confirm('이 시간을 삭제하시겠습니까?');
		if (!ok) return;

		setWindows((prev) => prev.filter((w) => w.clientId !== clientId));
	};

	return (
		<div className='md:col-span-2 space-y-4 rounded-lg border border-slate-200 p-4'>
			<div className='flex flex-col gap-1'>
				<p className='text-sm font-semibold text-slate-800'>
					수업 일정
				</p>
				<p className='text-xs text-slate-600'>
					최소 1개 이상의 시간 범위를 등록해주세요. 담당 강사를 지정할
					수 있습니다.
				</p>
			</div>

			<div className='grid gap-3 md:grid-cols-3'>
				<div>
					<label className='text-sm font-medium text-slate-700'>
						과정 기간
					</label>
					<Select
						name='weeks'
						defaultValue={(
							initialWeeks ?? weekOptions[0]
						).toString()}>
						{weekOptions.map((week) => (
							<option
								key={week}
								value={week}>
								{week}주 과정
							</option>
						))}
					</Select>
				</div>
				<input
					type='hidden'
					name='time_windows'
					value={windowsPayload}
				/>
			</div>

			<div className='space-y-3'>
				<div className='flex items-center justify-between'>
					<p className='text-sm font-medium text-slate-800'>
						가능 시간
					</p>
					<div className='flex items-center gap-2'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={addAllWeekWindows}>
							전체 시간 추가
						</Button>
						<Button
							type='button'
							variant='secondary'
							size='sm'
							onClick={addWindow}>
							시간 추가
						</Button>
					</div>
				</div>

				<div className='space-y-2'>
					{windows.map((window, index) => (
						<div
							key={window.clientId}
							className='grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]'>
							<div className='space-y-1'>
								<label className='text-xs text-slate-600'>
									요일
								</label>
								<Select
									value={window.day_of_week.toString()}
									onChange={(e) =>
										updateWindow(window.clientId, {
											day_of_week: Number(e.target.value),
										})
									}>
									{days.map((label, idx) => (
										<option
											key={label}
											value={idx}>
											{label}
										</option>
									))}
								</Select>
							</div>
							<div className='space-y-1'>
								<label className='text-xs text-slate-600'>
									시작
								</label>
								<Input
									type='time'
									value={window.start_time}
									onChange={(e) =>
										updateWindow(window.clientId, {
											start_time: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className='space-y-1'>
								<label className='text-xs text-slate-600'>
									종료
								</label>
								<Input
									type='time'
									value={window.end_time}
									onChange={(e) =>
										updateWindow(window.clientId, {
											end_time: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className='space-y-1'>
								<label className='text-xs text-slate-600'>
									강사 선택
								</label>
								<Select
									value={window.instructor_id ?? ''}
									onChange={(e) =>
										updateWindow(window.clientId, {
											instructor_id:
												e.target.value || undefined,
											instructor_name: e.target.value
												? ''
												: window.instructor_name,
										})
									}>
									<option value=''>
										직접 입력 또는 미지정
									</option>
									{instructors.map((inst) => (
										<option
											key={inst.id}
											value={inst.id}>
											{inst.name ?? '이름 미입력'} (
											{inst.email ?? '이메일 없음'})
										</option>
									))}
								</Select>
							</div>
							<div className='space-y-1'>
								<label className='text-xs text-slate-600'>
									강사 이름(직접 입력)
								</label>
								<Input
									placeholder='예: 외부 강사'
									value={window.instructor_name ?? ''}
									onChange={(e) =>
										updateWindow(window.clientId, {
											instructor_name: e.target.value,
											instructor_id: e.target.value
												? undefined
												: window.instructor_id,
										})
									}
									disabled={Boolean(window.instructor_id)}
								/>
							</div>
							<div className='flex items-end justify-end'>
								<Button
									type='button'
									variant='ghost'
									className='text-sm text-red-600'
									onClick={() =>
										removeWindow(window.clientId)
									}
									disabled={
										windows.length === 1 && index === 0
									}>
									삭제
								</Button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
