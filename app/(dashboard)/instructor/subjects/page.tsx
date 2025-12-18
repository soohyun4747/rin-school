import { addInstructorSubject, deleteInstructorSubject } from "@/app/actions/instructor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function InstructorSubjectsPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["instructor"]);
  const supabase = await getSupabaseServerClient();

  const { data: subjects } = await supabase
    .from("instructor_subjects")
    .select("id, subject, grade_range")
    .eq("instructor_id", profile.id)
    .order("subject", { ascending: true });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>가능 과목/학년 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addInstructorSubject} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">과목</label>
              <Input name="subject" placeholder="예: 수학" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">학년 범위</label>
              <Input name="grade_range" placeholder="중1-고1" required />
            </div>
            <div className="flex items-end">
              <Button type="submit">등록</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>등록된 과목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(subjects ?? []).length === 0 && <p className="text-slate-600">등록된 과목이 없습니다.</p>}
          {subjects?.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{item.subject}</p>
                <p className="text-xs text-slate-600">{item.grade_range}</p>
              </div>
              <form action={deleteInstructorSubject.bind(null, item.id)}>
                <Button variant="ghost" className="text-red-600" type="submit">
                  삭제
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
