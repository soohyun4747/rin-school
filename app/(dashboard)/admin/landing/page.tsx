import { deleteLandingImageByForm, reorderLandingImages, uploadLandingImage } from '@/app/actions/landing';
import { AdminLandingImageManager } from '@/components/features/admin-landing-image-manager';
import { fetchLandingImages } from '@/lib/landing';

export default async function LandingAdminPage() {
  const [desktopImages, mobileImages] = await Promise.all([
    fetchLandingImages('desktop'),
    fetchLandingImages('mobile'),
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
        <AdminLandingImageManager
          title="현재 노출 이미지 목록 (데스크톱)"
          variant="desktop"
          images={desktopImages}
          emptyMessage="아직 업로드된 데스크톱용 랜딩 이미지가 없습니다."
          reorderAction={reorderLandingImages}
          deleteAction={deleteLandingImageByForm}
        />

        <AdminLandingImageManager
          title="현재 노출 이미지 목록 (모바일)"
          variant="mobile"
          images={mobileImages}
          emptyMessage="아직 업로드된 모바일용 랜딩 이미지가 없습니다."
          reorderAction={reorderLandingImages}
          deleteAction={deleteLandingImageByForm}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--primary-border)] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">새 이미지 업로드 (데스크톱)</h2>
          <p className="text-sm text-slate-600">업로드할 때마다 목록의 마지막에 추가됩니다.</p>
          <p className="text-xs text-slate-500">권장 최소 사이즈: 1920 x 1080px</p>
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
          <p className="text-xs text-slate-500">권장 최소 사이즈: 1080 x 1440px</p>
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
