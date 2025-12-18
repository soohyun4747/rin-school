import { cancelApplication } from "@/app/actions/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";

export default async function StudentApplicationsPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  const { data: apps } = await supabase
    .from("applications")
    .select("id, status, created_at, course:course_id(id, title)")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>신청 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(apps ?? []).length === 0 && <p className="text-rose-700">신청 내역이 없습니다.</p>}
          {apps?.map((app) => (
            <div key={app.id} className="flex items-center justify-between rounded-md border border-rose-200 px-4 py-3">
              <div>
                <p className="font-semibold text-rose-900">{app.course?.title ?? "수업"}</p>
                <p className="text-xs text-rose-700">{formatDateTime(new Date(app.created_at))}</p>
                <p className="text-xs text-rose-800">상태: {app.status}</p>
              </div>
              {app.status === "pending" && (
                <form action={cancelApplication.bind(null, app.id)}>
                  <Button variant="ghost" className="text-red-600" type="submit">
                    취소
                  </Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
