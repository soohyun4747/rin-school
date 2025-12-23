"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { changePassword, deleteAccount, type DeleteAccountState, type PasswordUpdateState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const initialState: PasswordUpdateState = {};
  const [state, formAction] = useFormState<PasswordUpdateState, FormData>(changePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">현재 비밀번호</label>
          <Input name="current_password" type="password" required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">새 비밀번호</label>
          <Input name="new_password" type="password" required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">새 비밀번호 확인</label>
          <Input name="confirm_password" type="password" required />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">비밀번호 변경</Button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">비밀번호가 변경되었습니다.</p>}
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const initialState: DeleteAccountState = {};
  const [state, formAction] = useFormState<DeleteAccountState, FormData>(deleteAccount, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-slate-600">
        계정을 삭제하면 모든 신청, 시간표 정보가 즉시 제거되며 복구할 수 없습니다. 계속 진행하려면 아래 버튼을 눌러주세요.
      </p>
      <div className="flex items-center gap-3">
        <ConfirmSubmitButton
          variant="danger"
          message="정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        >
          회원 탈퇴
        </ConfirmSubmitButton>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
