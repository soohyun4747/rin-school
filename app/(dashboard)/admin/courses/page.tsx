import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession, requireRole } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CourseCreateModal } from '@/components/features/course-create-modal';
import { AdminCourseList } from '@/components/features/admin-course-list';

export interface ICourse {
        id: string;
        title: string;
        subject: string;
        grade_range: string;
        description: string | null;
        capacity: number;
        duration_minutes: number;
        weeks: number;
        created_at: number;
        image_url: string;
        display_order: number | null;
        is_closed: boolean;
}

export default async function AdminCoursesPage() {
        const { profile } = await requireSession();
        requireRole(profile.role, ['admin']);
        const supabase = await getSupabaseServerClient();
        const [{ data: courses, error }, { data: instructors }] = await Promise.all([
                supabase
                        .from('courses')
                        .select(
                                'id, title, subject, grade_range, description, capacity, duration_minutes, created_at, image_url, weeks, display_order, is_closed'
                        )
                        .order('display_order', { ascending: false, nullsLast: true })
                        .order('created_at', { ascending: false }),
                supabase
                        .from('profiles')
                        .select('id, name, email')
                        .eq('role', 'instructor')
                        .order('name', { ascending: true }),
        ]);

        if (error) {
                console.error(error);
        }

        return (
                <div className='space-y-6'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                <div>
                                        <h1 className='text-2xl font-bold text-slate-900'>수업 관리</h1>
                                        <p className='text-sm text-slate-600'>수업을 등록하고, 등록된 수업을 눌러 상세 관리 페이지로 이동하세요.</p>
                                </div>
                                <div className='flex flex-wrap items-center gap-2'>
                                        <Link
                                                href='/admin/notifications'
                                                className='rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                                                알림 이메일 관리
                                        </Link>
                                        <CourseCreateModal instructors={instructors ?? []} />
                                </div>
                        </div>

                        <Card>
                                <CardHeader>
                                        <CardTitle>수업 목록</CardTitle>
                                </CardHeader>
                                <CardContent className='space-y-3'>
                                        <AdminCourseList courses={courses ?? []} />
                                </CardContent>
                        </Card>
                </div>
        );
}
