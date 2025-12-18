'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { runMatching } from '@/lib/matching';

type TimeWindowInput = {
	day_of_week: number;
	start_time: string;
	end_time: string;
};

const ALLOWED_WEEKS = [1, 2, 3, 4, 6, 8, 12];

function parseTimeWindows(raw: string): TimeWindowInput[] {
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as TimeWindowInput[];
		return Array.isArray(parsed) ? parsed : [];
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

export async function createCourse(formData: FormData) {
	const { session, profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const title = String(formData.get('title') ?? '').trim();
	const subject = String(formData.get('subject') ?? '').trim();
	const gradeRange = String(formData.get('grade_range') ?? '').trim();
	const description = String(formData.get('description') ?? '').trim();
	const capacity = Number(formData.get('capacity') ?? 4);
	const duration = Number(formData.get('duration_minutes') ?? 60);
	const isTimeFixed = String(formData.get('is_time_fixed') ?? 'false') === 'true';
	const weeks = Number(formData.get('weeks') ?? 1);
	const parsedWindows = parseTimeWindows(
		String(formData.get('time_windows') ?? '')
	);
	const imageFile = formData.get('image');
	let imageUrl: string | null = null;

	if (!title || !subject || !gradeRange) {
		throw new Error('필수 항목을 모두 입력해주세요.');
	}

	if (!ALLOWED_WEEKS.includes(weeks)) {
		throw new Error('과정 기간을 올바르게 선택해주세요.');
	}

	if (description && description.length > 800) {
		throw new Error('설명은 800자 이내로 작성해주세요.');
	}

	if (isTimeFixed) {
		if (parsedWindows.length === 0) {
			throw new Error('고정 시간을 1개 이상 추가해주세요.');
		}
		validateTimeWindows(parsedWindows);
	}

	if (imageFile instanceof File && imageFile.size > 0) {
		if (imageFile.type && !imageFile.type.startsWith('image/')) {
			throw new Error('이미지 파일만 업로드할 수 있습니다.');
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
			throw new Error(
				'이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.'
			);
		}

		const { data } = supabase.storage
			.from('course-images')
			.getPublicUrl(filePath);
		imageUrl = data.publicUrl;
	}

	const { data: newCourse, error } = await supabase
		.from('courses')
		.insert({
			title,
			subject,
			grade_range: gradeRange,
			description: description || null,
			is_time_fixed: isTimeFixed,
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
		// ✅ Response 리턴 X, error 객체 통째로 전달 X
		throw new Error(`Insert failed: ${error.message}`);
	}

	if (isTimeFixed && newCourse?.id) {
		const timeWindows = parsedWindows.map((w) => ({
			course_id: newCourse.id,
			day_of_week: w.day_of_week,
			start_time: w.start_time,
			end_time: w.end_time,
		}));

		const { error: windowError } = await supabase
			.from('course_time_windows')
			.insert(timeWindows);

		if (windowError) {
			console.error('course time window insert error:', windowError);
			await supabase.from('courses').delete().eq('id', newCourse.id);
			throw new Error('수업 생성 중 시간이 저장되지 않았습니다. 다시 시도해주세요.');
		}
	}

	revalidatePath('/admin/courses');
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
}

export async function createTimeWindow(courseId: string, formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const dayOfWeek = Number(formData.get('day_of_week'));
	const startTime = String(formData.get('start_time') ?? '');
	const endTime = String(formData.get('end_time') ?? '');

	const { data: course } = await supabase
		.from('courses')
		.select('is_time_fixed')
		.eq('id', courseId)
		.single();

	if (!course?.is_time_fixed) {
		throw new Error('시간 협의형 수업에는 고정 시간을 추가할 수 없습니다.');
	}

	if (Number.isNaN(dayOfWeek) || !startTime || !endTime) {
		throw new Error('요일과 시간을 올바르게 입력해주세요.');
	}

	const { error } = await supabase.from('course_time_windows').insert({
		course_id: courseId,
		day_of_week: dayOfWeek,
		start_time: startTime,
		end_time: endTime,
	});

	if (error) {
		console.error(error);
	}

	revalidatePath(`/admin/courses/${courseId}/time-windows`);
}

export async function deleteTimeWindow(id: string, courseId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();
	await supabase.from('course_time_windows').delete().eq('id', id);
	revalidatePath(`/admin/courses/${courseId}/time-windows`);
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

export async function updateMatchSlot(courseId: string, matchId: string, formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const slotId = String(formData.get('slot_id') ?? '');
	const status = String(formData.get('status') ?? 'confirmed');

	if (!slotId) {
		throw new Error('슬롯을 선택해주세요.');
	}

	const { data: slot } = await supabase
		.from('availability_slots')
		.select('id, user_id, start_at, end_at, capacity')
		.eq('id', slotId)
		.eq('course_id', courseId)
		.single();

	if (!slot) {
		throw new Error('선택한 시간 슬롯을 찾을 수 없습니다.');
	}

	const { count } = await supabase
		.from('match_students')
		.select('student_id', { count: 'exact', head: true })
		.eq('match_id', matchId);

	const capacity = slot.capacity ?? 1;
	if (typeof count === 'number' && count > capacity) {
		throw new Error('선택한 시간의 정원을 초과합니다.');
	}

	await supabase
		.from('matches')
		.update({
			instructor_id: slot.user_id,
			slot_start_at: slot.start_at,
			slot_end_at: slot.end_at,
			status,
			updated_by: profile.id,
		})
		.eq('id', matchId)
		.eq('course_id', courseId);

	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
}

export async function assignStudentToSlot(courseId: string, formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const studentId = String(formData.get('student_id') ?? '');
	const slotId = String(formData.get('slot_id') ?? '');

	if (!studentId || !slotId) {
		throw new Error('학생과 시간을 모두 선택해주세요.');
	}

	const { data: slot } = await supabase
		.from('availability_slots')
		.select('id, user_id, start_at, end_at, capacity')
		.eq('id', slotId)
		.eq('course_id', courseId)
		.single();

	if (!slot) {
		throw new Error('선택한 시간 슬롯을 찾을 수 없습니다.');
	}

	const { data: match } = await supabase
		.from('matches')
		.upsert(
			{
				course_id: courseId,
				slot_start_at: slot.start_at,
				slot_end_at: slot.end_at,
				instructor_id: slot.user_id,
				status: 'confirmed',
				updated_by: profile.id,
			},
			{ onConflict: 'course_id,slot_start_at,instructor_id' }
		)
		.select('id')
		.single();

	if (!match?.id) {
		throw new Error('매칭을 생성하지 못했습니다.');
	}

	const { count } = await supabase
		.from('match_students')
		.select('student_id', { count: 'exact', head: true })
		.eq('match_id', match.id);

	const capacity = slot.capacity ?? 1;
	if (typeof count === 'number' && count >= capacity) {
		throw new Error('선택한 시간의 정원이 가득 찼습니다.');
	}

	await supabase
		.from('match_students')
		.upsert({ match_id: match.id, student_id: studentId }, { onConflict: 'match_id,student_id' });

	await supabase
		.from('applications')
		.update({ status: 'matched' })
		.eq('course_id', courseId)
		.eq('student_id', studentId);

	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath('/admin/courses');
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

export async function redirectToDashboard() {
	redirect('/dashboard');
}
