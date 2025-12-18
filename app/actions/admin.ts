'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { runMatching } from '@/lib/matching';

export async function createCourse(formData: FormData) {
  const { session, profile } = await requireSession();
  requireRole(profile.role, ['admin']);
  const supabase = await getSupabaseServerClient();

  const title = String(formData.get('title') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const imageUrl = String(formData.get('image_url') ?? '').trim();
  const gradeRange = String(formData.get('grade_range') ?? '').trim();
  const capacity = Number(formData.get('capacity') ?? 4);
  const duration = Number(formData.get('duration_minutes') ?? 60);

  if (!title || !subject || !gradeRange) {
    throw new Error('필수 항목을 모두 입력해주세요.');
  }

  const { error } = await supabase.from('courses').insert({
    title,
    subject,
    image_url: imageUrl || null,
    grade_range: gradeRange,
    capacity,
    duration_minutes: duration,
    created_by: session.user.id, // (권장: 아래 참고)
  });

  if (error) {
    console.error('courses insert error:', error);
    // ✅ Response 리턴 X, error 객체 통째로 전달 X
    throw new Error(`Insert failed: ${error.message}`);
  }

  revalidatePath('/admin/courses');
}

export async function deleteCourse(courseId: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();
	await supabase.from('courses').delete().eq('id', courseId);
	revalidatePath('/admin/courses');
}

export async function createTimeWindow(courseId: string, formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['admin']);
	const supabase = await getSupabaseServerClient();

	const dayOfWeek = Number(formData.get('day_of_week'));
	const startTime = String(formData.get('start_time') ?? '');
	const endTime = String(formData.get('end_time') ?? '');

	if (Number.isNaN(dayOfWeek) || !startTime || !endTime) {
		throw new Error('요일과 시간을 올바르게 입력해주세요.');
	}

	await supabase.from('course_time_windows').insert({
		course_id: courseId,
		day_of_week: dayOfWeek,
		start_time: startTime,
		end_time: endTime,
	});

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

		revalidatePath('/admin/matching');
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

	revalidatePath('/admin/matching');
	return batch?.id;
}

export async function redirectToDashboard() {
	redirect('/dashboard');
}
