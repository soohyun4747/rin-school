'use server';

import { revalidatePath } from 'next/cache';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function addInstructorSubject(formData: FormData) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['instructor']);
	const supabase = await getSupabaseServerClient();

	const subject = String(formData.get('subject') ?? '').trim();
	const gradeRange = String(formData.get('grade_range') ?? '').trim();
	if (!subject || !gradeRange) {
		throw new Error('과목과 학년을 입력해주세요.');
	}

	const { error } = await supabase.from('instructor_subjects').insert({
		instructor_id: profile.id,
		subject,
		grade_range: gradeRange,
	});

	if (error) {
		console.error({ error });
	}

	revalidatePath('/instructor/subjects');
}

export async function deleteInstructorSubject(id: string) {
	const { profile } = await requireSession();
	requireRole(profile.role, ['instructor']);
	const supabase = await getSupabaseServerClient();
	await supabase
		.from('instructor_subjects')
		.delete()
		.eq('id', id)
		.eq('instructor_id', profile.id);
	revalidatePath('/instructor/subjects');
}
