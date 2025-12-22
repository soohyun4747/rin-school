export default function GuardianConsentAlreadyConfirmedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-slate-900">이미 동의 완료</h1>
        <p className="mt-3 text-sm text-slate-700">
          해당 링크는 이미 처리되었습니다.
        </p>
      </div>
    </div>
  );
}
