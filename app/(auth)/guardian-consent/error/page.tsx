export default function GuardianConsentErrorPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams.reason;

  const message =
    reason === "missing"
      ? "잘못된 요청입니다."
      : reason === "invalid"
        ? "유효하지 않은 동의 링크입니다."
        : reason === "update_failed"
          ? "동의 처리 중 오류가 발생했습니다."
          : "요청을 처리할 수 없습니다.";

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-slate-900">동의 처리 실패</h1>
        <p className="mt-3 text-sm text-slate-700">{message}</p>
      </div>
    </div>
  );
}
