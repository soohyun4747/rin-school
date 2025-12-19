'use server';

import { revalidatePath } from 'next/cache';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { runMatching } from '@/lib/matching';
import { toHHMM } from '@/lib/time';

type SlotSelection = { windowId: string; start_time: string; end_time: string };

export async function applyToCourse(courseId: string, windowIds: string[]) {
	const { session, profile } = await requireSession();
	requireRole(profile.role, ['student']);
	const supabase = await getSupabaseServerClient();
	const rawSelections = Array.from(new Set(windowIds)).filter(Boolean);
	if (rawSelections.length === 0) {
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
			.select('capacity, duration_minutes')
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

	if (!windows || windows.length === 0) {
		throw new Error('선택한 시간이 유효하지 않습니다.');
	}

	const windowMap = new Map(windows.map((w) => [w.id, w]));
	const finalWindowIds: string[] = [];

	for (const selection of parsedSelections) {
		const baseWindow = windowMap.get(selection.windowId);
		if (!baseWindow) {
			throw new Error('존재하지 않는 시간이 포함되어 있습니다.');
		}

		console.log({ baseWindow });
		console.log({ selection });

		const isExactSlot =
			toHHMM(baseWindow.start_time) === toHHMM(selection.start_time) &&
			toHHMM(baseWindow.end_time) === toHHMM(selection.end_time);

		if (!isExactSlot) {
			throw new Error('선택한 시간이 수업 길이와 맞지 않습니다.');
		}

		finalWindowIds.push(baseWindow.id);
	}

	const windowSet = Array.from(new Set(finalWindowIds));

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
	}

	if (application?.id) {
		const choiceRows = windowSet.map((wid) => ({
			application_id: application.id,
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

	try {
		const from = new Date();
		const to = new Date();
		to.setDate(from.getDate() + 14);

		await runMatching({
			courseId,
			from: from.toISOString(),
			to: to.toISOString(),
			requestedBy: session!.user.id,
		});
	} catch (error) {
		console.error('자동 매칭 실행 실패', error);
	}

	revalidatePath(`/student/courses/${courseId}`);
	revalidatePath('/student/applications');
	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
	return application?.id;
}

export async function cancelApplication(applicationId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['student']);
	const supabase = await getSupabaseServerClient();

	await supabase
		.from('applications')
		.update({ status: 'cancelled' })
		.eq('id', applicationId)
		.eq('student_id', profile.id);

	revalidatePath('/student/applications');
}
