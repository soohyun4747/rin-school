import { addAdminNotificationEmail, deleteAdminNotificationEmail } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { requireRole, requireSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NotificationEmailForm } from "./_ui/notification-email-form";

export default async function AdminNotificationEmailsPage() {
  const { profile } = await requireSession();
  requireRole(profile.role, ["admin"]);
  const supabase = await getSupabaseServerClient();

  const { data: emails } = await supabase
    .from("admin_notification_emails")
    .select("id, email, label, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">관리자 알림 이메일</h1>
        <p className="text-sm text-slate-600">
          학생 신청/취소 등 주요 이벤트를 이메일로 받을 관리자를 등록하세요.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>등록된 이메일</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(emails ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">아직 등록된 이메일이 없습니다.</p>
            ) : (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {emails?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.label ? `${item.label} (${item.email})` : item.email}
                      </p>
                      {item.label && <p className="text-xs text-slate-500">{item.label}</p>}
                      <p className="text-xs text-slate-500">
                        등록일 {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <form action={deleteAdminNotificationEmail}>
                      <input type="hidden" name="id" value={item.id} />
                      <ConfirmSubmitButton
                        className="text-sm text-red-600 hover:bg-red-50"
                        variant="ghost"
                      >
                        삭제
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>이메일 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationEmailForm action={addAdminNotificationEmail} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
