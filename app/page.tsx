import Image from 'next/image';
import Link from 'next/link';
import { fetchLatestLandingImage } from '@/lib/landing';

export default async function HomePage() {
	const landingImage = await fetchLatestLandingImage();
	const imageUrl = landingImage?.publicUrl;

	return (
		<div>
			<Image
				src={imageUrl}
				alt='린스쿨 랜딩 이미지'
				width={1920} // 원본 이미지 비율
				height={1080} // 원본 이미지 비율
				sizes='100vw'
				className='w-full h-auto'
			/>

			<div className='mt-12 md:px-36 py-12'>
				<div className='flex flex-col gap-4 rounded-2xl border border-[var(--primary-border)] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between'>
					<div>
						<p className='text-sm font-semibold uppercase tracking-wide text-[var(--primary)]'>
							contact
						</p>
						<h2 className='text-xl font-bold text-slate-900'>
							궁금한게 있으신가요?
						</h2>
						<p className='text-sm text-slate-600'>
							문의 폼을 통해 궁금한 점을 물어보세요
						</p>
					</div>
					<Link
						href='/contact'
						className='inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black'>
						Contact 페이지로 이동
					</Link>
				</div>
			</div>
		</div>
	);
}
