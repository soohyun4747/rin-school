'use server';

import { revalidatePath } from 'next/cache';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { runMatching } from '@/lib/matching';
import { combineDayAndTime, splitWindowByDuration } from '@/lib/time';
import { sendEmail } from '@/lib/email';

type TimeWindowInput = {
	id?: string | null;
	day_of_week: number;
	start_time: string;
	end_time: string;
	instructor_id?: string | null;
	instructor_name?: string | null;
};

const ALLOWED_WEEKS = [1, 2, 3, 4, 6, 8, 12];

function parseTimeWindows(raw: string): TimeWindowInput[] {
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as Array<
			TimeWindowInput & { id?: string }
		>;
		if (!Array.isArray(parsed)) return [];
		return parsed.map((w) => {
			const id =
				typeof w.id === 'string' && w.id.trim() ? w.id.trim() : null;
			return {
				...w,
				id,
				instructor_id: w.instructor_id || null,
				instructor_name: w.instructor_name || null,
			};
		});
	} catch (error) {
		console.error('time window parse error', error);
		return [];
	}
}

function validateTimeWindows(windows: TimeWindowInput[]) {
	windows.forEach((w) => {
		if (
			Number.isNaN(w.day_of_week) ||
			w.day_of_week < 0 ||
			w.day_of_week > 6
		) {
			throw new Error('요일 정보를 다시 확인해주세요.');
		}

		if (!w.start_time || !w.end_time) {
			throw new Error('시작/종료 시간을 모두 입력해주세요.');
		}

		const [sHour, sMinute] = w.start_time.split(':').map(Number);
		const [eHour, eMinute] = w.end_time.split(':').map(Number);
		if (
			Number.isNaN(sHour) ||
			Number.isNaN(eHour) ||
			Number.isNaN(sMinute) ||
			Number.isNaN(eMinute)
		) {
			throw new Error('시간 형식을 다시 확인해주세요.');
		}

		const startMinutes = sHour * 60 + sMinute;
		const endMinutes = eHour * 60 + eMinute;
		if (startMinutes >= endMinutes) {
			throw new Error('시작 시간은 종료 시간보다 이전이어야 합니다.');
		}
	});
}

async function notifyScheduleConfirmation(
	supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
	payload: {
		courseId: string;
		slotStartAt: string;
		slotEndAt: string;
		instructorId: string | null;
		instructorName: string | null;
		studentIds: string[];
	}
) {
	try {
		const [{ data: course }, { data: students }, { data: instructor }] =
			await Promise.all([
				supabase
					.from('courses')
					.select('title')
					.eq('id', payload.courseId)
					.single(),
				payload.studentIds.length
					? supabase
							.from('profiles')
							.select('id, email, name')
							.in('id', payload.studentIds)
					: Promise.resolve({
							data: [] as { email: string | null }[],
						}),
				payload.instructorId
					? supabase
							.from('profiles')
							.select('id, email, name')
							.eq('id', payload.instructorId)
							.single()
					: Promise.resolve({
							data: null as { email: string | null } | null,
						}),
			]);

		const slotStart = new Date(payload.slotStartAt);
		const slotEnd = new Date(payload.slotEndAt);
		const timeText = `${slotStart.toLocaleString('ko-KR')} ~ ${slotEnd.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
		const courseTitle = course?.title ?? '수업';

		const studentEmails = (students ?? [])
			.map((s) => s.email)
			.filter(Boolean);
		if (studentEmails.length > 0) {
			await sendEmail({
				to: studentEmails,
				subject: `[린스쿨] 수업 일정이 확정되었습니다: ${courseTitle}`,
				text: `수업 일정이 확정되었습니다.\n수업명: ${courseTitle}\n시간: ${timeText}\n담당 강사: ${payload.instructorName ?? '미지정'}`,
			});
		}

		if (instructor?.email) {
			await sendEmail({
				to: instructor.email,
				subject: `[린스쿨] 담당 수업 일정 확정: ${courseTitle}`,
				text: `담당 수업 일정이 확정되었습니다.\n수업명: ${courseTitle}\n시간: ${timeText}\n학생 수: ${payload.studentIds.length}`,
			});
		}
	} catch (error) {
		console.error('일정 확정 알림 이메일 발송 실패', error);
	}
}

export type CourseCreationResult = { success: boolean; error?: string };
export type CourseUpdateResult = { success: boolean; error?: string };
export type CourseToggleResult = { success: boolean; error?: string };

export async function createCourse(
	_prevState: CourseCreationResult,
	formData: FormData
): Promise<CourseCreationResult> {
	const { session, profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const title = String(formData.get('title') ?? '').trim();
	const courseSubject = String(formData.get('subject') ?? '').trim();
	const gradeRange = String(formData.get('grade_range') ?? '').trim();
	const description = String(formData.get('description') ?? '').trim();
	const capacity = Number(formData.get('capacity') ?? 4);
	const duration = Number(formData.get('duration_minutes') ?? 60);
	const weeks = Number(formData.get('weeks') ?? 1);
	const parsedWindows = parseTimeWindows(
		String(formData.get('time_windows') ?? '')
	);
	const imageFile = formData.get('image');
	let imageUrl: string | null = null;

	if (!title || !courseSubject || !gradeRange) {
		return { success: false, error: '필수 항목을 모두 입력해주세요.' };
	}

	if (!ALLOWED_WEEKS.includes(weeks)) {
		return { success: false, error: '과정 기간을 올바르게 선택해주세요.' };
	}

	if (description && description.length > 800) {
		return { success: false, error: '설명은 800자 이내로 작성해주세요.' };
	}

	if (parsedWindows.length === 0) {
		return { success: false, error: '시간 범위를 1개 이상 추가해주세요.' };
	}

	try {
		validateTimeWindows(parsedWindows);
	} catch (error) {
		console.error(error);
		return {
			success: false,
			error: (error as Error).message,
		};
	}

	let slotWindows: Array<
		TimeWindowInput & {
			start_time: string;
			end_time: string;
		}
	> = [];
	try {
		slotWindows = parsedWindows.flatMap((window) => {
			const slots = splitWindowByDuration(window, duration).map(
				(slot) => ({
					...slot,
					id: window.id ?? null,
				})
			);

			if (slots.length > 1 && window.id) {
				return slots.map((slot) => ({ ...slot, id: null }));
			}

			return slots;
		});
	} catch (error) {
		return { success: false, error: (error as Error).message };
	}

	if (imageFile instanceof File && imageFile.size > 0) {
		if (imageFile.type && !imageFile.type.startsWith('image/')) {
			return {
				success: false,
				error: '이미지 파일만 업로드할 수 있습니다.',
			};
		}

		const extension = imageFile.name.split('.').pop() || 'png';
		const fileName = `${
			crypto.randomUUID?.() ?? Date.now().toString()
		}.${extension}`;
		const filePath = `courses/${session.user.id}/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('course-images')
			.upload(filePath, imageFile, {
				cacheControl: '3600',
				upsert: false,
				contentType: imageFile.type || undefined,
			});

		if (uploadError) {
			console.error('course image upload error:', uploadError);
			return {
				success: false,
				error: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.',
			};
		}

		const { data } = supabase.storage
			.from('course-images')
			.getPublicUrl(filePath);
		imageUrl = data.publicUrl;
	}

	const { data: lastCourse } = await supabase
		.from('courses')
		.select('display_order')
		.order('display_order', { ascending: false, nullsLast: true })
		.limit(1)
		.maybeSingle();

	const nextDisplayOrder = (lastCourse?.display_order ?? 0) + 1;

	const { data: newCourse, error } = await supabase
		.from('courses')
		.insert({
			title,
			subject: courseSubject,
			grade_range: gradeRange,
			description: description || null,
			display_order: nextDisplayOrder,
			weeks,
			capacity,
			duration_minutes: duration,
			image_url: imageUrl,
			created_by: session.user.id, // (권장: 아래 참고)
		})
		.select('id')
		.single();

	if (error) {
		console.error('courses insert error:', error);
		return { success: false, error: `Insert failed: ${error.message}` };
	}

	if (newCourse?.id) {
		const timeWindows = slotWindows.map((w) => ({
			course_id: newCourse.id,
			day_of_week: w.day_of_week,
			start_time: w.start_time,
			end_time: w.end_time,
			instructor_id: w.instructor_id || null,
			instructor_name: w.instructor_name || null,
			capacity,
		}));

		const { error: windowError } = await supabase
			.from('course_time_windows')
			.insert(timeWindows);

		if (windowError) {
			console.error('course time window insert error:', windowError);
			await supabase.from('courses').delete().eq('id', newCourse.id);
			return {
				success: false,
				error: '수업 생성 중 시간이 저장되지 않았습니다. 다시 시도해주세요.',
			};
		}

		const assignedInstructorIds = Array.from(
			new Set(
				parsedWindows
					.map((w) => w.instructor_id)
					.filter((id): id is string => Boolean(id))
			)
		);

		if (assignedInstructorIds.length) {
			try {
				const { data: instructors } = await supabase
					.from('profiles')
					.select('email, name')
					.in('id', assignedInstructorIds);

				const to =
					instructors?.map((inst) => inst.email).filter(Boolean) ??
					[];
				if (to.length > 0) {
					await sendEmail({
						to,
						subject: `[린스쿨] 새 수업 담당 안내: ${title}`,
						text: `담당 강사로 지정된 수업이 등록되었습니다.\n수업명: ${title}\n과목: ${courseSubject}\n정원: ${capacity}명`,
					});
				}
			} catch (emailError) {
				console.error('수업 등록 알림 이메일 발송 실패', emailError);
			}
		}
	}

	revalidatePath('/admin/courses');
	revalidatePath('/classes');
	return { success: true };
}

export async function updateCourse(
	courseId: string,
	_prevState: CourseUpdateResult,
	formData: FormData
): Promise<CourseUpdateResult> {
	const { session, profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const title = String(formData.get('title') ?? '').trim();
	const courseSubject = String(formData.get('subject') ?? '').trim();
	const gradeRange = String(formData.get('grade_range') ?? '').trim();
	const description = String(formData.get('description') ?? '').trim();
	const capacity = Number(formData.get('capacity') ?? 4);
	const duration = Number(formData.get('duration_minutes') ?? 60);
	const weeks = Number(formData.get('weeks') ?? 1);
	const parsedWindows = parseTimeWindows(
		String(formData.get('time_windows') ?? '')
	);
	const currentImageUrl = String(
		formData.get('current_image_url') ?? ''
	).trim();
	const imageFile = formData.get('image');
	let imageUrl: string | null = currentImageUrl || null;

	if (!title || !courseSubject || !gradeRange) {
		return { success: false, error: '필수 항목을 모두 입력해주세요.' };
	}

	if (!ALLOWED_WEEKS.includes(weeks)) {
		return { success: false, error: '과정 기간을 올바르게 선택해주세요.' };
	}

	if (description && description.length > 800) {
		return { success: false, error: '설명은 800자 이내로 작성해주세요.' };
	}

	if (parsedWindows.length === 0) {
		return { success: false, error: '시간 범위를 1개 이상 추가해주세요.' };
	}

	try {
		validateTimeWindows(parsedWindows);
	} catch (error) {
		console.error(error);
		return {
			success: false,
			error: (error as Error).message,
		};
	}

	let slotWindows: Array<
		TimeWindowInput & {
			start_time: string;
			end_time: string;
		}
	> = [];
	try {
		slotWindows = parsedWindows.flatMap((window) => {
			const slots = splitWindowByDuration(window, duration).map(
				(slot) => ({
					...slot,
					id: window.id ?? null,
				})
			);

			if (slots.length > 1 && window.id) {
				return slots.map((slot) => ({ ...slot, id: null }));
			}

			return slots;
		});
	} catch (error) {
		return { success: false, error: (error as Error).message };
	}

	if (imageFile instanceof File && imageFile.size > 0) {
		if (imageFile.type && !imageFile.type.startsWith('image/')) {
			return {
				success: false,
				error: '이미지 파일만 업로드할 수 있습니다.',
			};
		}

		const extension = imageFile.name.split('.').pop() || 'png';
		const fileName = `${
			crypto.randomUUID?.() ?? Date.now().toString()
		}.${extension}`;
		const filePath = `courses/${session.user.id}/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('course-images')
			.upload(filePath, imageFile, {
				cacheControl: '3600',
				upsert: false,
				contentType: imageFile.type || undefined,
			});

		if (uploadError) {
			console.error('course image upload error:', uploadError);
			return {
				success: false,
				error: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.',
			};
		}

		const { data } = supabase.storage
			.from('course-images')
			.getPublicUrl(filePath);
		imageUrl = data.publicUrl;
	}

	const { error: courseUpdateError } = await supabase
		.from('courses')
		.update({
			title,
			subject: courseSubject,
			grade_range: gradeRange,
			description: description || null,
			weeks,
			capacity,
			duration_minutes: duration,
			image_url: imageUrl,
		})
		.eq('id', courseId);

	if (courseUpdateError) {
		console.error('courses update error:', courseUpdateError);
		return {
			success: false,
			error: `Update failed: ${courseUpdateError.message}`,
		};
	}

	const timeWindows = slotWindows.map((w) => ({
		...(w.id ? { id: w.id } : {}),
		course_id: courseId,
		day_of_week: w.day_of_week,
		start_time: w.start_time,
		end_time: w.end_time,
		instructor_id: w.instructor_id || null,
		instructor_name: w.instructor_name || null,
		capacity,
	}));

	const { data: existingWindows, error: existingFetchError } = await supabase
		.from('course_time_windows')
		.select('id')
		.eq('course_id', courseId);

	if (existingFetchError) {
		console.error('course time window fetch error:', existingFetchError);
		return {
			success: false,
			error: '현재 시간 정보를 불러오지 못했습니다.',
		};
	}

	const existingIds = new Set((existingWindows ?? []).map((w) => w.id));
	const updatableRows = timeWindows.filter(
		(w) => w.id && existingIds.has(w.id)
	);
	const insertRows = timeWindows.filter(
		(w) => !w.id || !existingIds.has(w.id)
	);
	const idsToKeep = new Set(updatableRows.map((w) => w.id!));
	const idsToDelete = [...existingIds].filter((id) => !idsToKeep.has(id));

	if (idsToDelete.length > 0) {
		const { error: deleteError } = await supabase
			.from('course_time_windows')
			.delete()
			.in('id', idsToDelete);

		if (deleteError) {
			console.error('course time window delete error:', deleteError);
			return {
				success: false,
				error: '삭제된 시간 범위를 정리하지 못했습니다. 다시 시도해주세요.',
			};
		}
	}

	if (updatableRows.length > 0) {
		const { error: updateError } = await supabase
			.from('course_time_windows')
			.upsert(updatableRows);

		if (updateError) {
			console.error('course time window update error:', updateError);
			return {
				success: false,
				error: '시간 정보를 업데이트하지 못했습니다. 다시 시도해주세요.',
			};
		}
	}

	if (insertRows.length > 0) {
		const { error: insertError } = await supabase
			.from('course_time_windows')
			.insert(insertRows);

		if (insertError) {
			console.error('course time window insert error:', insertError);
			return {
				success: false,
				error: '시간 정보를 저장하지 못했습니다. 다시 시도해주세요.',
			};
		}
	}

	revalidatePath('/admin/courses');
	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath(`/admin/courses/${courseId}/time-windows`);
	revalidatePath(`/admin/courses/${courseId}/edit`);
	revalidatePath('/classes');
	return { success: true };
}

export async function updateCourseClosed(
	courseId: string,
	isClosed: boolean
): Promise<CourseToggleResult> {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const { error } = await supabase
		.from('courses')
		.update({ is_closed: isClosed })
		.eq('id', courseId);

	if (error) {
		console.error('course toggle closed error:', error);
		return { success: false, error: '신청 마감 상태 변경에 실패했습니다.' };
	}

	revalidatePath('/admin/courses');
	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath(`/admin/courses/${courseId}/time-windows`);
	revalidatePath(`/admin/courses/${courseId}/edit`);
	revalidatePath('/classes');
	revalidatePath(`/classes/${courseId}`);

	return { success: true };
}

export async function deleteCourse(courseId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const { error } = await supabase
		.from('courses')
		.delete()
		.eq('id', courseId);

	if (error) {
		console.error(error);
	}
	revalidatePath('/admin/courses');
	revalidatePath('/classes');
}

export async function reorderCourses(courseIds: string[]) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	// 병렬 업데이트
	const results = await Promise.all(
		courseIds.map((id, index) =>
			supabase
				.from('courses')
				.update({ display_order: courseIds.length - index })
				.eq('id', id)
		)
	);

	const error = results.find((r) => r.error)?.error;

	if (error) {
		console.error('course reorder error:', error);
		return {
			success: false,
			error: '수업 순서를 저장하는 중 문제가 발생했습니다. 다시 시도해주세요.',
		};
	}

	revalidatePath('/admin/courses');
	revalidatePath('/classes');
	return { success: true };
}

export async function createTimeWindow(courseId: string, formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const { data: course } = await supabase
		.from('courses')
		.select('capacity, duration_minutes')
		.eq('id', courseId)
		.single();

	if (!course) {
		throw new Error('수업 정보를 불러오지 못했습니다.');
	}

	const dayOfWeek = Number(formData.get('day_of_week'));
	const startTime = String(formData.get('start_time') ?? '');
	const endTime = String(formData.get('end_time') ?? '');
	const instructorId = String(formData.get('instructor_id') ?? '').trim();
	const instructorName = String(formData.get('instructor_name') ?? '').trim();

	if (Number.isNaN(dayOfWeek) || !startTime || !endTime) {
		throw new Error('요일과 시간을 올바르게 입력해주세요.');
	}

	let slotWindows: {
		start_time: string;
		end_time: string;
		day_of_week: number;
	}[];
	try {
		slotWindows = splitWindowByDuration(
			{
				day_of_week: dayOfWeek,
				start_time: startTime,
				end_time: endTime,
			},
			course.duration_minutes
		);
	} catch (error) {
		throw new Error((error as Error).message);
	}

	const rows = slotWindows.map((slot) => ({
		course_id: courseId,
		day_of_week: slot.day_of_week,
		start_time: slot.start_time,
		end_time: slot.end_time,
		instructor_id: instructorId || null,
		instructor_name: instructorName || null,
		capacity: course.capacity,
	}));

	const { error } = await supabase.from('course_time_windows').insert(rows);

	if (error) {
		console.error(error);
	}

	revalidatePath(`/admin/courses/${courseId}/time-windows`);
	revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteTimeWindow(id: string, courseId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();
	await supabase.from('course_time_windows').delete().eq('id', id);
	revalidatePath(`/admin/courses/${courseId}/time-windows`);
	revalidatePath(`/admin/courses/${courseId}`);
}

export type MatchingFormState = { error?: string; success?: string };

export async function runMatchingAction(
	prevState: MatchingFormState,
	formData: FormData
): Promise<MatchingFormState> {
	const { profile, session } = await requireSession();
	requireRole(profile.role, ['admin']);

	const courseId = String(formData.get('course_id') ?? '');
	const from = String(formData.get('from') ?? '');
	const to = String(formData.get('to') ?? '');

	if (!courseId || !from || !to) {
		return { error: '모든 필드를 입력해주세요.' };
	}

	try {
		const result = await runMatching({
			courseId,
			from,
			to,
			requestedBy: session!.user.id,
		});

		revalidatePath('/admin/courses');
		revalidatePath(`/admin/courses/${courseId}`);
		return {
			success: `매칭 완료: ${result.matchedCount}명 매칭, ${result.unmatchedCount}명 대기`,
		};
	} catch (error) {
		return { error: (error as Error).message };
	}
}

export type ScheduleProposalStudent = {
	student_id: string;
	application_id: string;
};

export type ScheduleProposal = {
	window_id: string;
	slot_start_at: string;
	slot_end_at: string;
	instructor_id: string | null;
	instructor_name: string | null;
	capacity: number;
	students: ScheduleProposalStudent[];
};

export type ScheduleProposalResult = {
	proposals: ScheduleProposal[];
	error?: string;
	generated_at?: string;
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

export async function generateScheduleProposals(
	courseId: string
): Promise<ScheduleProposalResult> {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const [{ data: course }, { data: windows }, { data: applications }] =
		await Promise.all([
			supabase
				.from('courses')
				.select('id, duration_minutes, capacity')
				.eq('id', courseId)
				.single(),
			supabase
				.from('course_time_windows')
				.select(
					'id, day_of_week, start_time, end_time, instructor_id, instructor_name, capacity'
				)
				.eq('course_id', courseId),
			supabase
				.from('applications')
				.select(
					'id, student_id, created_at, status, application_time_choices(window_id)'
				)
				.eq('course_id', courseId)
				.order('created_at', { ascending: true }),
		]);

	if (!course) {
		return { proposals: [], error: '수업 정보를 불러오지 못했습니다.' };
	}

	const pendingApplications = (applications ?? []).filter(
		(app) => app.status === 'pending'
	);

	// === 학생 birthdate 로드 ===
	const pendingStudentIds = Array.from(
		new Set(pendingApplications.map((app) => app.student_id))
	);

	const { data: profileRows } = pendingStudentIds.length
		? await supabase
				.from('profiles')
				.select('id, birthdate')
				.in('id', pendingStudentIds)
		: { data: [] as { id: string; birthdate: string | null }[] };

	const profileMap = new Map(
		(profileRows ?? []).map((p) => [p.id, p.birthdate])
	);

	// ✅ window별 수요(해당 window를 선택한 pending 학생 수) 집계
	const demandByWindowId = new Map<string, number>();
	for (const app of pendingApplications) {
		const choices = app.application_time_choices ?? [];
		// 같은 학생이 같은 window를 중복 저장했을 가능성 방어
		const uniqueWindowIds = new Set(choices.map((c) => c.window_id));
		for (const wid of uniqueWindowIds) {
			demandByWindowId.set(wid, (demandByWindowId.get(wid) ?? 0) + 1);
		}
	}

	const maxDemand =
		windows && windows.length
			? Math.max(...windows.map((w) => demandByWindowId.get(w.id) ?? 0))
			: 0;

	// ✅ 인기 시간대가 1개 이상이면(= maxDemand > 0) 인기 window 전부만 추천
	// ✅ 아니면 기존처럼 전체 window를 요일/시간 순으로 추천
	const targetWindows =
		(windows ?? [])
			.slice()
			.filter((w) =>
				maxDemand > 0
					? (demandByWindowId.get(w.id) ?? 0) === maxDemand
					: true
			)
			.sort((a, b) => {
				// 인기 모드에서는 demand가 전부 같으니 요일/시간 정렬
				if (a.day_of_week !== b.day_of_week)
					return a.day_of_week - b.day_of_week;
				return a.start_time.localeCompare(b.start_time);
			}) ?? [];

	const reference = new Date();
	const proposals: ScheduleProposal[] = [];

	// maxDemand > 0 (인기 모드): window마다 독립적으로 후보를 뽑아 “다 추천”
	// maxDemand === 0 (일반 모드): 기존처럼 학생 중복배정 방지
	const assignedStudents = new Set<string>();
	const useAssignedStudents = maxDemand === 0;

	for (const window of targetWindows) {
		const candidates = pendingApplications
			.filter((app) => {
				if (useAssignedStudents && assignedStudents.has(app.student_id))
					return false;
				return (app.application_time_choices ?? []).some(
					(choice) => choice.window_id === window.id
				);
			})
			.map((app) => ({
				application: app,
				age: calculateAge(profileMap.get(app.student_id) ?? null),
			}))
			.sort((a, b) => {
				// 1) 선착순
				const createdDiff =
					new Date(a.application.created_at).getTime() -
					new Date(b.application.created_at).getTime();
				if (createdDiff !== 0) return createdDiff;

				// 2) 동률이면 나이 많은 학생 우선 (birthdate 없는 경우 뒤로)
				if (a.age === null && b.age === null) return 0;
				if (a.age === null) return 1;
				if (b.age === null) return -1;
				return b.age - a.age;
			});

		if (candidates.length === 0) continue;

		const slotStart = combineDayAndTime(
			window.day_of_week,
			window.start_time,
			reference
		);
		const slotEnd = new Date(
			slotStart.getTime() + course.duration_minutes * 60000
		);

		const capacity = window.capacity ?? course.capacity;
		const selected = candidates.slice(0, capacity);

		if (useAssignedStudents) {
			selected.forEach((item) =>
				assignedStudents.add(item.application.student_id)
			);
		}

		proposals.push({
			window_id: window.id,
			slot_start_at: slotStart.toISOString(),
			slot_end_at: slotEnd.toISOString(),
			instructor_id: window.instructor_id,
			instructor_name: window.instructor_name,
			capacity,
			students: selected.map((entry) => ({
				student_id: entry.application.student_id,
				application_id: entry.application.id,
			})),
		});
	}

	return { proposals, generated_at: new Date().toISOString() };
}

export async function updateProposedMatch(
	courseId: string,
	formData: FormData
) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const matchId = String(formData.get('match_id') ?? '');
	const start = String(formData.get('slot_start_at') ?? '');
	const end = String(formData.get('slot_end_at') ?? '');

	if (!matchId || !start || !end) {
		throw new Error('시간 정보를 모두 입력해주세요.');
	}

	const startAt = new Date(start);
	const endAt = new Date(end);

	if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
		throw new Error('시간 형식이 올바르지 않습니다.');
	}
	if (startAt >= endAt) {
		throw new Error('시작 시간은 종료 시간보다 앞서야 합니다.');
	}

	await supabase
		.from('matches')
		.update({
			slot_start_at: startAt.toISOString(),
			slot_end_at: endAt.toISOString(),
			updated_by: profile.id,
			status: 'proposed',
		})
		.eq('id', matchId);

	revalidatePath(`/admin/courses/${courseId}`);
}

export async function addStudentToMatch(courseId: string, formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const matchId = String(formData.get('match_id') ?? '');
	const studentId = String(formData.get('student_id') ?? '');

	if (!matchId || !studentId) {
		throw new Error('학생과 매칭 정보를 확인해주세요.');
	}

	const { data: match } = await supabase
		.from('matches')
		.select(
			'id, course_id, status, slot_start_at, slot_end_at, instructor_name'
		)
		.eq('id', matchId)
		.single();

	if (!match || match.course_id !== courseId) {
		throw new Error('매칭을 찾을 수 없습니다.');
	}

	const { error } = await supabase
		.from('match_students')
		.insert({ match_id: matchId, student_id: studentId });

	if (!error && match.status === 'confirmed') {
		await supabase
			.from('applications')
			.update({ status: 'matched' })
			.eq('course_id', courseId)
			.eq('student_id', studentId);

		try {
			const [{ data: student }, { data: course }] = await Promise.all([
				supabase
					.from('profiles')
					.select('email')
					.eq('id', studentId)
					.single(),
				supabase
					.from('courses')
					.select('title')
					.eq('id', courseId)
					.single(),
			]);

			if (student?.email && match.slot_start_at && match.slot_end_at) {
				const slotStart = new Date(match.slot_start_at);
				const slotEnd = new Date(match.slot_end_at);
				const timeText = `${slotStart.toLocaleString('ko-KR')} ~ ${slotEnd.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
				const courseTitle = course?.title ?? '수업';
				await sendEmail({
					to: student.email,
					subject: `[린스쿨] 수업 일정이 확정되었습니다: ${courseTitle}`,
					text: `수업 일정이 확정되었습니다.\n수업명: ${courseTitle}\n시간: ${timeText}\n담당 강사: ${match.instructor_name ?? '미지정'}`,
				});
			}
		} catch (error) {
			console.error('확정 일정 학생 추가 이메일 발송 실패', error);
		}
	}

	revalidatePath(`/admin/courses/${courseId}`);
}

export async function confirmMatchSchedule(courseId: string, matchId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const { data: match } = await supabase
		.from('matches')
		.select('course_id')
		.eq('id', matchId)
		.single();

	if (!match || match.course_id !== courseId) {
		throw new Error('매칭을 찾을 수 없습니다.');
	}

	const { data: students } = await supabase
		.from('match_students')
		.select('student_id')
		.eq('match_id', matchId);

	await supabase
		.from('matches')
		.update({
			status: 'confirmed',
			updated_by: profile.id,
			updated_at: new Date().toISOString(),
		})
		.eq('id', matchId);

	const { data: matchDetail } = await supabase
		.from('matches')
		.select('slot_start_at, slot_end_at, instructor_id, instructor_name')
		.eq('id', matchId)
		.single();

	if (students?.length) {
		await supabase
			.from('applications')
			.update({ status: 'matched' })
			.eq('course_id', courseId)
			.in(
				'student_id',
				students.map((s) => s.student_id)
			);
	}

	if (matchDetail) {
		await notifyScheduleConfirmation(supabase, {
			courseId,
			slotStartAt: matchDetail.slot_start_at,
			slotEndAt: matchDetail.slot_end_at,
			instructorId: matchDetail.instructor_id,
			instructorName: matchDetail.instructor_name,
			studentIds: students?.map((s) => s.student_id) ?? [],
		});
	}

	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
}

export type ConfirmSchedulePayload = {
	slot_start_at: string;
	slot_end_at: string;
	instructor_id: string | null;
	instructor_name: string | null;
	student_ids: string[];
};

export type ConfirmScheduleResult = { success?: string; error?: string };

export async function confirmScheduleFromProposal(
	courseId: string,
	payload: ConfirmSchedulePayload
): Promise<ConfirmScheduleResult> {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const startAt = new Date(payload.slot_start_at);
	const endAt = new Date(payload.slot_end_at);
	if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
		return { error: '시간 정보를 확인해주세요.' };
	}
	if (startAt >= endAt) {
		return { error: '시작 시간이 종료 시간보다 이전이어야 합니다.' };
	}

	const { data: course } = await supabase
		.from('courses')
		.select('capacity')
		.eq('id', courseId)
		.single();

	if (!course) {
		return { error: '수업 정보를 불러올 수 없습니다.' };
	}

	if (payload.student_ids.length === 0) {
		return { error: '배치할 학생을 선택해주세요.' };
	}

	if (payload.student_ids.length > course.capacity) {
		return { error: '정원보다 많은 학생을 배치할 수 없습니다.' };
	}

	const { data: match, error: matchError } = await supabase
		.from('matches')
		.insert({
			course_id: courseId,
			slot_start_at: startAt.toISOString(),
			slot_end_at: endAt.toISOString(),
			instructor_id: payload.instructor_id,
			instructor_name: payload.instructor_name,
			status: 'confirmed',
			updated_by: profile.id,
			updated_at: new Date().toISOString(),
		})
		.select(
			'id, slot_start_at, slot_end_at, instructor_id, instructor_name'
		)
		.single();

	if (matchError || !match?.id) {
		console.error('confirm schedule insert error', matchError);
		return {
			error: '일정 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
		};
	}

	const { error: studentsError } = await supabase
		.from('match_students')
		.insert(
			payload.student_ids.map((studentId) => ({
				match_id: match.id,
				student_id: studentId,
			}))
		);

	if (studentsError) {
		console.error('match_students insert error', studentsError);
		await supabase.from('matches').delete().eq('id', match.id);
		return {
			error: '학생 배치에 실패했습니다. 다시 시도해주세요.',
		};
	}

	await supabase
		.from('applications')
		.update({ status: 'matched' })
		.eq('course_id', courseId)
		.in('student_id', payload.student_ids);

	await notifyScheduleConfirmation(supabase, {
		courseId,
		slotStartAt: match.slot_start_at,
		slotEndAt: match.slot_end_at,
		instructorId: match.instructor_id,
		instructorName: match.instructor_name,
		studentIds: payload.student_ids,
	});

	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
	return { success: '일정을 확정했습니다.' };
}

export async function deleteMatchSchedule(courseId: string, matchId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const { data: match } = await supabase
		.from('matches')
		.select('course_id')
		.eq('id', matchId)
		.single();

	if (!match || match.course_id !== courseId) {
		throw new Error('매칭을 찾을 수 없습니다.');
	}

	const { data: students } = await supabase
		.from('match_students')
		.select('student_id')
		.eq('match_id', matchId);

	await supabase.from('matches').delete().eq('id', matchId);

	if (students?.length) {
		await supabase
			.from('applications')
			.update({ status: 'pending' })
			.eq('course_id', courseId)
			.in(
				'student_id',
				students.map((s) => s.student_id)
			);
	}

	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
	revalidatePath('/student/applications');
	revalidatePath('/student/timetable');
}

export async function sendEmailBatch(formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const subject = String(formData.get('subject') ?? '매칭 안내');
	const body = String(formData.get('body') ?? '');
	if (!body) {
		throw new Error('본문을 입력해주세요.');
	}

	const { data: batch } = await supabase
		.from('email_batches')
		.insert({ created_by: profile.id, subject, body, status: 'running' })
		.select('id')
		.single();

	// TODO: 실제 이메일 발송 (Resend 등) 연동
	await supabase
		.from('email_batches')
		.update({ status: 'done' })
		.eq('id', batch?.id);

	revalidatePath('/admin/courses');
	return batch?.id;
}

export async function removeStudentFromMatch(
	courseId: string,
	matchId: string,
	studentId: string
) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	await supabase
		.from('match_students')
		.delete()
		.eq('match_id', matchId)
		.eq('student_id', studentId);

	await supabase
		.from('applications')
		.update({ status: 'pending' })
		.eq('course_id', courseId)
		.eq('student_id', studentId);

	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
}

export type AdminNotificationEmailFormState = {
	success?: string;
	error?: string;
};

export async function addAdminNotificationEmail(
	_prevState: AdminNotificationEmailFormState,
	formData: FormData
): Promise<AdminNotificationEmailFormState> {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const email = String(formData.get('email') ?? '').trim();
	const label = String(formData.get('label') ?? '').trim();

	if (!email) {
		return { error: '이메일을 입력해주세요.' };
	}

	const { error } = await supabase.from('admin_notification_emails').insert({
		email,
		label: label || null,
		created_by: profile.id,
	});

	if (error) {
		console.error('admin notification email insert error', error);
		return { error: '이메일을 저장하는 중 오류가 발생했습니다.' };
	}

	revalidatePath('/admin/notifications');
	return { success: '알림 이메일을 추가했습니다.' };
}

export async function deleteAdminNotificationEmail(formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const id = String(formData.get('id') ?? '');
	if (!id) return;

	const { error } = await supabase
		.from('admin_notification_emails')
		.delete()
		.eq('id', id);

	if (error) {
		console.error('admin notification email delete error', error);
	}

	revalidatePath('/admin/notifications');
}
