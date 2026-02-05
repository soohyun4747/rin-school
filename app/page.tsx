import Image from "next/image";
import Link from "next/link";
import { fetchLandingImages } from "@/lib/landing";

export default async function HomePage() {
  const [desktopImages, mobileImages] = await Promise.all([
    fetchLandingImages("desktop"),
    fetchLandingImages("mobile"),
  ]);

  const desktopDisplayImages = desktopImages.length > 0 ? desktopImages : mobileImages;
  const mobileDisplayImages = mobileImages.length > 0 ? mobileImages : desktopImages;

  return (
    <div>
      {mobileDisplayImages.length > 0 && (
        <div className="md:hidden">
          {mobileDisplayImages.map((image, index) => {
            const content = (
              <Image
                src={image.publicUrl}
                alt={`린스쿨 랜딩 이미지 (모바일) ${index + 1}`}
                width={1080}
                height={1920}
                sizes="100vw"
                className="h-auto w-full"
                priority={index === 0}
              />
            );

            if (!image.linkUrl) {
              return <div key={image.path}>{content}</div>;
            }

            return (
              <a key={image.path} href={image.linkUrl} target="_blank" rel="noreferrer noopener" className="block">
                {content}
              </a>
            );
          })}
        </div>
      )}

      {desktopDisplayImages.length > 0 && (
        <div className="hidden md:block">
          {desktopDisplayImages.map((image, index) => {
            const content = (
              <Image
                src={image.publicUrl}
                alt={`린스쿨 랜딩 이미지 ${index + 1}`}
                width={1920}
                height={1080}
                sizes="100vw"
                className="h-auto w-full"
                priority={index === 0}
              />
            );

            if (!image.linkUrl) {
              return <div key={image.path}>{content}</div>;
            }

            return (
              <a key={image.path} href={image.linkUrl} target="_blank" rel="noreferrer noopener" className="block">
                {content}
              </a>
            );
          })}
        </div>
      )}

      {desktopDisplayImages.length === 0 && mobileDisplayImages.length === 0 && (
        <div className="flex h-64 items-center justify-center bg-slate-100 text-sm text-slate-600 md:h-96">
          노출할 랜딩 이미지를 업로드해주세요.
        </div>
      )}

      <div className="mt-12 py-12 md:px-36">
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--primary-border)] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">contact</p>
            <h2 className="text-xl font-bold text-slate-900">궁금한게 있으신가요?</h2>
            <p className="text-sm text-slate-600">문의 폼을 통해 궁금한 점을 물어보세요</p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Contact 페이지로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
