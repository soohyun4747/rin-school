import Image from "next/image";
import { deleteLandingImageByForm, uploadLandingImage } from "@/app/actions/landing";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { fetchLandingImages } from "@/lib/landing";

export default async function LandingAdminPage() {
  const [desktopImages, mobileImages] = await Promise.all([
    fetchLandingImages("desktop"),
    fetchLandingImages("mobile"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">랜딩 이미지 관리</h1>
        <p className="text-sm text-slate-600">
          데스크톱/모바일 이미지를 여러 장 등록할 수 있으며, 등록한 순서대로 랜딩페이지에 이어서 노출됩니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-[var(--primary-border)] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">현재 노출 이미지 목록 (데스크톱)</h2>
          {desktopImages.length > 0 ? (
            <div className="space-y-4">
              {desktopImages.map((image, index) => (
                <div key={image.path} className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">순서 {index + 1}</p>
                  <div className="relative h-48 overflow-hidden rounded-lg border bg-slate-100 md:h-64">
                    <Image
                      src={image.publicUrl}
                      alt={`랜딩 이미지 (데스크톱) ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 720px, 100vw"
                    />
                  </div>
                  <p className="text-xs break-all text-slate-600">링크: {image.linkUrl ?? "설정 안 함"}</p>
                  <form action={deleteLandingImageByForm}>
                    <input type="hidden" name="variant" value="desktop" />
                    <input type="hidden" name="path" value={image.path} />
                    <ConfirmSubmitButton message="이 랜딩 이미지를 삭제하시겠습니까?" variant="danger" size="sm">
                      이미지 삭제
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">아직 업로드된 데스크톱용 랜딩 이미지가 없습니다.</p>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--primary-border)] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">현재 노출 이미지 목록 (모바일)</h2>
          {mobileImages.length > 0 ? (
            <div className="space-y-4">
              {mobileImages.map((image, index) => (
                <div key={image.path} className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">순서 {index + 1}</p>
                  <div className="relative h-48 overflow-hidden rounded-lg border bg-slate-100 md:h-64">
                    <Image
                      src={image.publicUrl}
                      alt={`랜딩 이미지 (모바일) ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 720px, 100vw"
                    />
                  </div>
                  <p className="text-xs break-all text-slate-600">링크: {image.linkUrl ?? "설정 안 함"}</p>
                  <form action={deleteLandingImageByForm}>
                    <input type="hidden" name="variant" value="mobile" />
                    <input type="hidden" name="path" value={image.path} />
                    <ConfirmSubmitButton message="이 랜딩 이미지를 삭제하시겠습니까?" variant="danger" size="sm">
                      이미지 삭제
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">아직 업로드된 모바일용 랜딩 이미지가 없습니다.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--primary-border)] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">새 이미지 업로드 (데스크톱)</h2>
          <p className="text-sm text-slate-600">업로드할 때마다 목록의 마지막에 추가됩니다.</p>
          <form action={uploadLandingImage} className="mt-4 space-y-3">
            <input type="hidden" name="variant" value="desktop" />
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">이미지 파일</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">클릭 이동 링크 (선택)</label>
              <input
                type="url"
                name="linkUrl"
                placeholder="https://example.com"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)]"
            >
              업로드
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[var(--primary-border)] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">새 이미지 업로드 (모바일)</h2>
          <p className="text-sm text-slate-600">업로드할 때마다 목록의 마지막에 추가됩니다.</p>
          <form action={uploadLandingImage} className="mt-4 space-y-3">
            <input type="hidden" name="variant" value="mobile" />
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">이미지 파일</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">클릭 이동 링크 (선택)</label>
              <input
                type="url"
                name="linkUrl"
                placeholder="https://example.com"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)]"
            >
              업로드
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
