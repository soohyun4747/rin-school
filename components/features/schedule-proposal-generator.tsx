'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
	confirmScheduleFromProposal,
	generateScheduleProposals,
	type ConfirmScheduleResult,
	type ScheduleProposal,
	type ScheduleProposalResult,
} from '@/app/actions/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { formatDateTime, formatDayTime } from '@/lib/time';

type ApplicationRow = {
	id: string;
	student_id: string;
	status: string;
	created_at: string;
	application_time_choices: { window_id: string }[];
};

type WindowRow = {
	id: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	instructor_id: string | null;
	instructor_name: string | null;
};

type ProfileRow = {
	id: string;
	name: string | null;
	phone: string | null;
	birthdate: string | null;
};

type Props = {
	course: {
		id: string;
		duration_minutes: number;
		capacity: number;
	};
	windows: WindowRow[];
	applications: ApplicationRow[];
	profiles: ProfileRow[];
};

const days = ['일', '월', '화', '수', '목', '금', '토'];

type EditableProposal = {
	key: string;
	window_id: string;
	slotStart: Date;
	slotEnd: Date;
	instructor_id: string | null;
	instructor_name: string | null;
	capacity: number;
	studentIds: string[];
};

function calculateAge(birthdate: string | null) {
	if (!birthdate) return null;
	const date = new Date(birthdate);
	if (Number.isNaN(date.getTime())) return null;

	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const monthDiff = today.getMonth() - date.getMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < date.getDate())
	) {
		age -= 1;
	}
	return age;
}

function windowLabel(w: WindowRow) {
	return `${days[w.day_of_week]} ${w.start_time} - ${w.end_time}`;
}

export default function ScheduleProposalGenerator({
	course,
	windows,
	applications,
	profiles,
}: Props) {
	const router = useRouter();
	const profileMap = useMemo(
		() => new Map(profiles.map((p) => [p.id, p])),
		[profiles]
	);
	const applicationByStudent = useMemo(() => {
		const map = new Map<string, ApplicationRow>();
		applications.forEach((app) => {
			if (!map.has(app.student_id)) {
				map.set(app.student_id, app);
			}
		});
		return map;
	}, [applications]);
	const windowMap = useMemo(
		() => new Map(windows.map((w) => [w.id, w])),
		[windows]
	);

	const [result, setResult] = useState<ScheduleProposalResult>({
		proposals: [],
	});
	const [editableProposals, setEditableProposals] = useState<
		EditableProposal[]
	>([]);
	const [isGenerating, startGenerating] = useTransition();
	const [isConfirming, startConfirming] = useTransition();
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [selectedStudents, setSelectedStudents] = useState<
		Record<string, string>
	>({});
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const instructorLabel = (w: WindowRow) =>
		w.instructor_id
			? profileMap.get(w.instructor_id)?.name ?? w.instructor_id
			: w.instructor_name || '미지정';

	const availabilityForStudent = (studentId: string) => {
		const app = applicationByStudent.get(studentId);
		const choices = app?.application_time_choices ?? [];
		const labels = choices.map((choice) => {
			const window = windowMap.get(choice.window_id);
			return window ? windowLabel(window) : '삭제된 시간';
		});
		return labels.length > 0 ? labels.join(', ') : '선택 없음';
	};

	const toTimeInput = (date: Date) =>
		`${date.getHours().toString().padStart(2, '0')}:${date
			.getMinutes()
			.toString()
			.padStart(2, '0')}`;

	const applyTime = (date: Date, time: string) => {
		const [hour, minute] = time.split(':').map(Number);
		if (Number.isNaN(hour) || Number.isNaN(minute)) return date;
		const updated = new Date(date);
		updated.setHours(hour, minute, 0, 0);
		return updated;
	};

	const studentOptions = useMemo(
		() =>
			Array.from(
				new Set(
					applications
						.filter((app) => app.status === 'pending')
						.map((app) => app.student_id)
				)
			).map((id) => ({
				id,
				name: profileMap.get(id)?.name ?? id,
			})),
		[applications, profileMap]
	);

	const setProposals = (proposals: ScheduleProposal[]) => {
		const editable = proposals.map((proposal) => ({
			key: `${proposal.window_id}-${proposal.slot_start_at}`,
			window_id: proposal.window_id,
			slotStart: new Date(proposal.slot_start_at),
			slotEnd: new Date(proposal.slot_end_at),
			instructor_id: proposal.instructor_id,
			instructor_name: proposal.instructor_name,
			capacity: proposal.capacity,
			studentIds: proposal.students.map((s) => s.student_id),
		}));
		setEditableProposals(editable);
	};

	const handleGenerate = () => {
		startGenerating(async () => {
			setError(null);
			setMessage(null);
			setSelectedStudents({});
			const response = await generateScheduleProposals(course.id);
			setResult(response);
			setProposals(response.proposals);
			if (response.error) {
				setError(response.error);
			} else if (response.proposals.length === 0) {
				setMessage('조건에 맞는 추천 시간표가 없습니다.');
			}
		});
	};

	const handleConfirm = (key: string) => {
		startConfirming(async () => {
			const proposal = editableProposals.find((p) => p.key === key);
			if (!proposal) return;

			if (proposal.slotEnd <= proposal.slotStart) {
				setError('종료 시간이 시작 시간보다 늦어야 합니다.');
				return;
			}

			if (proposal.studentIds.length === 0) {
				setError('배치할 학생을 선택해주세요.');
				return;
			}

			setConfirmingId(proposal.key);
			setError(null);
			const payload = {
				slot_start_at: proposal.slotStart.toISOString(),
				slot_end_at: proposal.slotEnd.toISOString(),
				instructor_id: proposal.instructor_id,
				instructor_name: proposal.instructor_name,
				student_ids: proposal.studentIds,
			};
			const response: ConfirmScheduleResult =
				await confirmScheduleFromProposal(course.id, payload);
			if (response.error) {
				setError(response.error);
			} else {
				setMessage('일정을 확정했습니다.');
				router.refresh();
			}
			setConfirmingId(null);
		});
	};

	const handleTimeChange = (
		key: string,
		type: 'start' | 'end',
		value: string
	) => {
		setEditableProposals((prev) =>
			prev.map((proposal) => {
				if (proposal.key !== key) return proposal;
				if (type === 'start') {
					return {
						...proposal,
						slotStart: applyTime(proposal.slotStart, value),
					};
				}
				return { ...proposal, slotEnd: applyTime(proposal.slotEnd, value) };
			})
		);
	};

	const handleRemoveStudent = (key: string, studentId: string) => {
		setEditableProposals((prev) =>
			prev.map((proposal) =>
				proposal.key === key
					? {
							...proposal,
							studentIds: proposal.studentIds.filter(
								(id) => id !== studentId
							),
					  }
					: proposal
			)
		);
	};

	const handleAddStudent = (key: string) => {
		const studentId = selectedStudents[key];
		if (!studentId) {
			setError('추가할 학생을 선택해주세요.');
			return;
		}

		const alreadyInOtherProposal = editableProposals.some(
			(p) => p.key !== key && p.studentIds.includes(studentId)
		);
		if (alreadyInOtherProposal) {
			setError('학생은 한 일정에만 배정할 수 있습니다.');
			return;
		}

		setEditableProposals((prev) =>
			prev.map((proposal) => {
				if (proposal.key !== key) return proposal;
				if (proposal.studentIds.length >= proposal.capacity) {
					setError('정원보다 많은 학생을 배정할 수 없습니다.');
					return proposal;
				}
				if (proposal.studentIds.includes(studentId)) {
					setError('이미 배치된 학생입니다.');
					return proposal;
				}

				return {
					...proposal,
					studentIds: [...proposal.studentIds, studentId],
				};
			})
		);
		setError(null);
	};

	return (
		<>
			<CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div className='space-y-1'>
					<CardTitle>가능한 시간표 생성</CardTitle>
					<p className='text-sm text-slate-600'>
						신청한 시간대와 정원을 기준으로 추천 시간표를 만들고
						확정할 수 있습니다. 생성된 추천안은 DB에 저장되지 않으며,
						확정한 일정만 저장됩니다.
					</p>
				</div>
				<Button onClick={handleGenerate} disabled={isGenerating}>
					{isGenerating ? '생성 중...' : '생성하기'}
				</Button>
			</CardHeader>
			<CardContent className='space-y-4 text-sm'>
				{result.generated_at && (
					<p className='text-xs text-slate-500'>
						{formatDateTime(new Date(result.generated_at))}에
						생성된 추천안
					</p>
				)}
				{error && (
					<p className='text-xs font-semibold text-red-600'>
						{error}
					</p>
				)}
				{message && !error && (
					<p className='text-xs text-slate-600'>{message}</p>
				)}
				{result.proposals.length === 0 && !error && !message && (
					<p className='text-slate-600'>
						아직 제안된 시간표가 없습니다. 생성하기 버튼을 눌러 추천
						일정을 받아보세요.
					</p>
				)}
				{editableProposals.map((proposal) => {
					const windowInfo = windowMap.get(proposal.window_id);
					const instructorText = windowInfo
						? instructorLabel(windowInfo)
						: proposal.instructor_name ?? '미지정';
					const availableOptions = studentOptions.filter(
						(option) =>
							!proposal.studentIds.includes(option.id) &&
							!editableProposals.some(
								(p) =>
									p.key !== proposal.key &&
									p.studentIds.includes(option.id)
							)
					);
					return (
						<div
							key={proposal.key}
							className='space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm'>
							<div className='flex flex-wrap items-center justify-between gap-2'>
								<div>
									<p className='text-sm font-semibold text-slate-900'>
										{formatDayTime(proposal.slotStart)} ~{' '}
										{formatDayTime(proposal.slotEnd)}
									</p>
									<p className='text-xs text-slate-600'>
										강사:{' '}
										{instructorText}
									</p>
								</div>
								<Badge variant='warning'>제안됨</Badge>
							</div>
							<div className='grid gap-3 sm:grid-cols-2'>
								<label className='space-y-1 text-xs font-semibold text-slate-700'>
									<span>시작 시간</span>
									<input
										type='time'
										value={toTimeInput(proposal.slotStart)}
										onChange={(e) =>
											handleTimeChange(
												proposal.key,
												'start',
												e.target.value
											)
										}
										className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
									/>
								</label>
								<label className='space-y-1 text-xs font-semibold text-slate-700'>
									<span>종료 시간</span>
									<input
										type='time'
										value={toTimeInput(proposal.slotEnd)}
										onChange={(e) =>
											handleTimeChange(
												proposal.key,
												'end',
												e.target.value
											)
										}
										className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
									/>
								</label>
							</div>
							<div className='space-y-2'>
								<p className='text-xs font-semibold text-slate-700'>
									배치된 학생 ({proposal.studentIds.length} /{' '}
									{proposal.capacity})
								</p>
								{proposal.studentIds.length === 0 ? (
									<p className='text-xs text-slate-600'>
										배치할 학생이 없습니다.
									</p>
								) : (
									<ul className='space-y-2'>
										{proposal.studentIds.map((studentId) => {
											const profile =
												profileMap.get(studentId);
											const age = calculateAge(
												profile?.birthdate ?? null
											);
											const availability =
												availabilityForStudent(
													studentId
												);
											return (
												<li
													key={studentId}
													className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2'>
													<div className='flex flex-col'>
														<p className='text-sm font-semibold text-slate-900'>
															{profile?.name ??
																studentId}
														</p>
														<p className='text-xs text-slate-600'>
															{profile?.phone ??
																'연락처 없음'}{' '}
															·{' '}
															{age !== null
																? `${age}세`
																: '나이 정보 없음'}
														</p>
														<span className='text-[11px] text-slate-500'>
															가능 시간대:{' '}
															{availability}
														</span>
													</div>
													<div className='flex gap-2'>
														<Button
															variant='ghost'
															size='sm'
															onClick={() =>
																handleRemoveStudent(
																	proposal.key,
																	studentId
																)
															}
															className='text-xs text-red-600'>
															배정 해제
														</Button>
													</div>
												</li>
											);
										})}
									</ul>
								)}
							</div>
							<div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
								<select
									className='rounded-md border border-slate-200 px-3 py-2 text-sm'
									value={selectedStudents[proposal.key] ?? ''}
									onChange={(e) =>
										setSelectedStudents((prev) => ({
											...prev,
											[proposal.key]: e.target.value,
										}))
									}>
									<option value=''>학생 추가</option>
									{availableOptions.map((student) => (
										<option key={student.id} value={student.id}>
											{student.name}
										</option>
									))}
								</select>
								<Button
									variant='outline'
									onClick={() => handleAddStudent(proposal.key)}
									disabled={availableOptions.length === 0}>
									학생 추가
								</Button>
							</div>
							<div className='flex justify-end'>
								<Button
									variant='secondary'
									onClick={() => handleConfirm(proposal.key)}
									disabled={
										proposal.studentIds.length === 0 ||
										isConfirming
									}>
									{confirmingId === proposal.key
										? '확정 중...'
										: '이 일정 확정'}
								</Button>
							</div>
						</div>
					);
				})}
			</CardContent>
		</>
	);
}
