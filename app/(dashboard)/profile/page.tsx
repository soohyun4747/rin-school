import { ChangePasswordForm, DeleteAccountForm } from "@/components/profile/security-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";

export default async function ProfilePage() {
  const { profile } = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">내 프로필</h1>
        <p className="text-sm text-slate-600">비밀번호를 변경하거나 계정을 삭제할 수 있습니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-slate-500 sm:w-28">이름</span>
            <span className="font-medium text-slate-900">{profile.name}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-slate-500 sm:w-28">이메일</span>
            <span className="font-medium text-slate-900">{profile.email}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-slate-500 sm:w-28">역할</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
              {profile.role}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">회원 탈퇴</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
