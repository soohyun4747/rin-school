import { cancelApplication } from "@/app/actions/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { requireSession, requireRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";

const days = ["일", "월", "화", "수", "목", "금", "토"];

export default async function StudentApplicationsPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["student"]);
  const supabase = await getSupabaseServerClient();

  const { data: apps } = await supabase
    .from("applications")
    .select(
      `
        id,
        status,
        created_at,
        course:course_id(id, title),
        choices:application_time_choices(
          window:course_time_windows(id, day_of_week, start_time, end_time, instructor_name)
        ),
        requests:application_time_requests(
          day_of_week, start_time, end_time
        )
      `
    )
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  type ApplicationRow = {
    id: string;
    status: string;
    created_at: string;
    course: { id: string; title: string } | null;
    choices?: {
      window?:
        | {
            id: string;
            day_of_week: number;
            start_time: string;
            end_time: string;
            instructor_name: string | null;
          }
        | null;
    }[];
    requests?: {
      day_of_week: number;
      start_time: string;
      end_time: string;
    }[];
  };

  const applications: ApplicationRow[] = (apps as ApplicationRow[] | null) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>신청 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {applications.length === 0 && <p className="text-slate-600">신청 내역이 없습니다.</p>}
          {applications.map((app) => {
            const selectedTimeSummaries =
              app.choices?.map((choice) => {
                const win = choice.window;
                if (!win) return "삭제된 시간";
                return `${days[win.day_of_week]} ${win.start_time} - ${win.end_time}${
                  win.instructor_name ? ` · ${win.instructor_name}` : ""
                }`;
              }) ?? [];

            const requestedTimeSummaries =
              app.requests?.map(
                (request) =>
                  `${days[request.day_of_week]} ${request.start_time} - ${request.end_time}`
              ) ?? [];

            return (
            <div key={app.id} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{app.course?.title ?? "수업"}</p>
                <p className="text-xs text-slate-600">{formatDateTime(new Date(app.created_at))}</p>
                <p className="text-xs text-slate-700">상태: {app.status}</p>
                {selectedTimeSummaries.length > 0 && (
                  <p className="text-xs text-slate-600">
                    선택한 시간:{" "}
                    {selectedTimeSummaries.map((summary, idx) => (
                      <span key={`${app.id}-${idx}`}>
                        {idx > 0 && ", "}
                        {summary}
                      </span>
                    ))}
                  </p>
                )}
                {requestedTimeSummaries.length > 0 && (
                  <p className="text-xs text-slate-600">
                    신청한 시간:{" "}
                    {requestedTimeSummaries.map((summary, idx) => (
                      <span key={`${app.id}-request-${idx}`}>
                        {idx > 0 && ", "}
                        {summary}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              {app.status === "pending" && (
                <form action={cancelApplication.bind(null, app.id)}>
                  <ConfirmSubmitButton variant="ghost" className="text-red-600">
                    취소
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
