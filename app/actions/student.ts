'use server';

import { revalidatePath } from 'next/cache';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { splitWindowByDuration, toHHMM } from '@/lib/time';
import { sendEmail } from '@/lib/email';
import { getAdminNotificationEmails } from '@/lib/notifications';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/admin';

type SlotSelection = { windowId: string; start_time: string; end_time: string };
type CustomTimeSelection = {
	day_of_week: number;
	start_time: string;
	end_time: string;
};

function minutesFromTimeString(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
}

export async function applyToCourse(
	courseId: string,
	windowIds: string[],
	customTimes: CustomTimeSelection[] = []
) {
	const { session, profile } = await requireSession();
	requireRole(profile.role, ['student']);
	const supabase = await getSupabaseServerClient();
	const rawSelections = Array.from(new Set(windowIds)).filter(Boolean);
	const normalizedCustomTimes = customTimes
		.filter((time) => time.start_time && time.end_time)
		.map((time) => ({
			day_of_week: Number(time.day_of_week),
			start_time: toHHMM(time.start_time),
			end_time: toHHMM(time.end_time),
		}));
	const uniqueCustomTimes = Array.from(
		new Map(
			normalizedCustomTimes.map((time) => [
				`${time.day_of_week}|${time.start_time}|${time.end_time}`,
				time,
			])
		).values()
	);
	if (rawSelections.length === 0 && uniqueCustomTimes.length === 0) {
		throw new Error('최소 1개 이상의 시간을 선택해주세요.');
	}

	const parsedSelections: SlotSelection[] = rawSelections.map((value) => {
		const [windowId, start_time, end_time] = value.split('|');
		if (!windowId || !start_time || !end_time) {
			throw new Error('선택한 시간 형식이 올바르지 않습니다.');
		}
		return { windowId, start_time, end_time };
	});

        const [{ data: course }, { data: windows }] = await Promise.all([
                supabase
                        .from('courses')
                        .select('capacity, duration_minutes, title, is_closed')
                        .eq('id', courseId)
                        .single(),
                supabase
			.from('course_time_windows')
			.select(
				'id, day_of_week, start_time, end_time, instructor_id, instructor_name'
			)
			.eq('course_id', courseId),
	]);

        if (!course) {
                throw new Error('수업 정보를 불러오지 못했습니다.');
        }

        if (course.is_closed) {
                throw new Error('신청이 마감된 수업입니다.');
        }

        if (!windows || windows.length === 0) {
                if (uniqueCustomTimes.length === 0) {
                        throw new Error('선택한 시간이 유효하지 않습니다.');
                }
        }

	const { data: existing } = await supabase
		.from('applications')
		.select('id, status')
		.eq('course_id', courseId)
		.eq('student_id', session!.user.id)
		.order('created_at', { ascending: false })
		.limit(1);

	const existingApplication = existing?.[0] ?? null;
	if (existingApplication && existingApplication.status !== 'cancelled') {
		throw new Error('이미 이 수업에 신청하셨습니다.');
	}

	const windowMap = new Map((windows ?? []).map((w) => [w.id, w]));
	const finalWindowIds: string[] = [];
	const selectableSlotKeys = new Set<string>();

	(windows ?? []).forEach((window) => {
		try {
			const splitSlots = splitWindowByDuration(window, course.duration_minutes);
			splitSlots.forEach((slot) => {
				selectableSlotKeys.add(
					`${slot.day_of_week}|${toHHMM(slot.start_time)}|${toHHMM(
						slot.end_time
					)}`
				);
			});
		} catch {
			selectableSlotKeys.add(
				`${window.day_of_week}|${toHHMM(window.start_time)}|${toHHMM(
					window.end_time
				)}`
			);
		}
	});

	if (windows && windows.length > 0) {
		for (const selection of parsedSelections) {
			const baseWindow = windowMap.get(selection.windowId);
			if (!baseWindow) {
				throw new Error('존재하지 않는 시간이 포함되어 있습니다.');
			}

			const isExactSlot =
				toHHMM(baseWindow.start_time) === toHHMM(selection.start_time) &&
				toHHMM(baseWindow.end_time) === toHHMM(selection.end_time);

			if (!isExactSlot) {
				throw new Error('선택한 시간이 수업 길이와 맞지 않습니다.');
			}

			finalWindowIds.push(baseWindow.id);
		}
	}

	const windowSet = Array.from(new Set(finalWindowIds));

	let applicationId: string | null = null;

	if (existingApplication?.id && existingApplication.status === 'cancelled') {
		const { error: updateError } = await supabase
			.from('applications')
			.update({
				status: 'pending',
				created_at: new Date().toISOString(),
			})
			.eq('id', existingApplication.id)
			.eq('student_id', session!.user.id);

		if (updateError) {
			console.error({ updateError });
			throw new Error('신청을 다시 저장하는 데 실패했습니다.');
		}

		await supabase
			.from('application_time_choices')
			.delete()
			.eq('application_id', existingApplication.id);
		await supabase
			.from('application_time_requests')
			.delete()
			.eq('application_id', existingApplication.id);

		applicationId = existingApplication.id;
	}

	if (!applicationId) {
		const { data: application, error: applicationsErr } = await supabase
			.from('applications')
			.insert({ course_id: courseId, student_id: session!.user.id })
			.select('id')
			.single();

		if (applicationsErr) {
			console.error({ applicationsErr });
			if (applicationsErr?.code === '23505') {
				throw new Error('이미 이 수업에 신청하셨습니다.');
			}
			throw new Error(
				'신청을 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.'
			);
		}

		applicationId = application?.id ?? null;
	}

	if (applicationId) {
		if (windowSet.length > 0) {
			const choiceRows = windowSet.map((wid) => ({
				application_id: applicationId,
				window_id: wid,
			}));
			const { error: choiceError } = await supabase
				.from('application_time_choices')
				.insert(choiceRows);
			if (choiceError) {
				console.error('신청 시간 저장 실패', choiceError);
				throw new Error(
					'선택한 시간 저장에 실패했습니다. 다시 시도해주세요.'
				);
			}
		}
		if (uniqueCustomTimes.length > 0) {
			const invalid = uniqueCustomTimes.some((time) => {
				if (Number.isNaN(time.day_of_week)) return true;
				if (time.day_of_week < 0 || time.day_of_week > 6) return true;
				const startMinutes = minutesFromTimeString(time.start_time);
				const endMinutes = minutesFromTimeString(time.end_time);
				return (
					Number.isNaN(startMinutes) ||
					Number.isNaN(endMinutes) ||
					startMinutes >= endMinutes
				);
			});
			if (invalid) {
				throw new Error('선택한 시간이 유효하지 않습니다.');
			}

			const hasExistingOptionSelection = uniqueCustomTimes.some((time) =>
				selectableSlotKeys.has(
					`${time.day_of_week}|${time.start_time}|${time.end_time}`
				)
			);
			if (hasExistingOptionSelection) {
				throw new Error(
					'이미 선택 가능한 시간대는 직접 신청할 수 없습니다. 기존 옵션에서 선택해주세요.'
				);
			}

			const requestRows = uniqueCustomTimes.map((time) => ({
				application_id: applicationId,
				day_of_week: time.day_of_week,
				start_time: time.start_time,
				end_time: time.end_time,
			}));
			const { error: requestError } = await supabase
				.from('application_time_requests')
				.insert(requestRows);
			if (requestError) {
				console.error('신청 시간 저장 실패', requestError);
				throw new Error(
					'선택한 시간 저장에 실패했습니다. 다시 시도해주세요.'
				);
			}
		}
	}

	// try {
	// 	const from = new Date();
	// 	const to = new Date();
	// 	to.setDate(from.getDate() + 14);

	// 	await runMatching({
	// 		courseId,
	// 		from: from.toISOString(),
	// 		to: to.toISOString(),
	// 		requestedBy: session!.user.id,
	// 	});
	// } catch (error) {
	// 	console.error('자동 매칭 실행 실패', error);
	// }

	try {
		const adminClient = getSupabaseServiceRoleClient();
		const adminEmails = await getAdminNotificationEmails(adminClient);
		if (adminEmails.length > 0) {
			await sendEmail({
				to: adminEmails,
				subject: `[린스쿨] 학생 신청 알림: ${course.title}`,
				text: `${profile.name ?? '학생'}이(가) "${course.title}" 수업에 신청했습니다.`,
			});
		}
	} catch (error) {
		console.error('관리자 신청 알림 발송 실패', error);
	}

	revalidatePath(`/student/courses/${courseId}`);
	revalidatePath('/student/applications');
	revalidatePath(`/classes/${courseId}`);
	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
	revalidatePath('/student/timetable');
	return applicationId;
}

export async function cancelApplication(applicationId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['student']);
	const supabase = await getSupabaseServerClient();

	const { data: application } = await supabase
		.from('applications')
		.select('course_id, courses(title)')
		.eq('id', applicationId)
		.eq('student_id', profile.id)
		.single();

	const courseTitle =
		(application as { courses?: { title?: string } } | null)?.courses
			?.title ?? undefined;

	await supabase
		.from('applications')
		.update({ status: 'cancelled' })
		.eq('id', applicationId)
		.eq('student_id', profile.id);

	revalidatePath('/student/applications');

	if (!application?.course_id) return;

	try {
		const adminClient = getSupabaseServiceRoleClient();
		const adminEmails = await getAdminNotificationEmails(adminClient);
		if (adminEmails.length > 0) {
			await sendEmail({
				to: adminEmails,
				subject: `[린스쿨] 학생 신청 취소 알림${courseTitle ? `: ${courseTitle}` : ''}`,
				text: `${profile.name ?? '학생'}이(가) "${courseTitle ?? '수업'}" 신청을 취소했습니다.`,
			});
		}
	} catch (error) {
		console.error('관리자 취소 알림 발송 실패', error);
	}
}
