'use server';

import { revalidatePath } from "next/cache";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runMatching } from "@/lib/matching";

export async function applyToCourse(courseId: string, slotsString: string) {
	const { session, profile } = await requireSession();
	requireRole(profile.role, ['student']);
	const supabase = await getSupabaseServerClient();

	const slots = slotsString
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => {
			const [start, end] = s.split('|');
			return { start, end };
		});

	if (slots.length === 0) {
		throw new Error('최소 1개 이상의 시간을 선택해주세요.');
	}

	const { data: application, error } = await supabase
		.from('applications')
		.insert({ course_id: courseId, student_id: session!.user.id })
		.select('id')
		.single();

	if (error) {
		console.error(error);
	}

	const slotRows = slots.map((slot) => ({
		course_id: courseId,
		user_id: session!.user.id,
		role: 'student' as const,
		start_at: slot.start,
		end_at: slot.end,
		capacity: 1,
	}));

  try {
    const starts = slotRows.map((s) => new Date(s.start_at).getTime());
    const ends = slotRows.map((s) => new Date(s.end_at).getTime());
    const from = new Date(Math.min(...starts)).toISOString();
    const to = new Date(Math.max(...ends)).toISOString();

    await runMatching({ courseId, from, to, requestedBy: session!.user.id });
  } catch (error) {
    console.error("자동 매칭 실행 실패", error);
  }

  revalidatePath(`/student/courses/${courseId}`);
  revalidatePath("/student/applications");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
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
