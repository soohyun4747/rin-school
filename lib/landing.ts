import { getSupabaseServerClient } from '@/lib/supabase/server';

export type LandingImage = {
	name: string;
	path: string;
	publicUrl: string;
	createdAt?: string;
	variant: 'desktop' | 'mobile';
	linkUrl: string | null;
};

type LandingVariant = 'desktop' | 'mobile';

type LandingImageMetadata = {
	path: string;
	linkUrl: string | null;
};

const metadataFileName = 'metadata.json';

async function fetchLandingMetadata(
	variant: LandingVariant,
): Promise<Map<string, LandingImageMetadata>> {
	const supabase = await getSupabaseServerClient();
	const metadataPath = `landing/${variant}/${metadataFileName}`;
	const { data, error } = await supabase.storage
		.from('landing-images')
		.download(metadataPath);

	if (error || !data) {
		return new Map();
	}

	try {
		const rawText = await data.text();
		const parsed = JSON.parse(rawText) as {
			images?: LandingImageMetadata[];
		};
		const images = parsed.images ?? [];
		return new Map(images.map((item) => [item.path, item]));
	} catch (parseError) {
		console.error('랜딩 메타데이터 파싱 실패:', parseError);
		return new Map();
	}
}

async function fetchLandingVariantImages(
	variant: LandingVariant,
): Promise<LandingImage[]> {
	const hasSupabaseEnv =
		process.env.NEXT_PUBLIC_SUPABASE_URL &&
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!hasSupabaseEnv) {
		return [];
	}

	try {
		const supabase = await getSupabaseServerClient();
		const metadataByPath = await fetchLandingMetadata(variant);
		const folderPath = `landing/${variant}`;
		const { data: variantFiles, error: variantError } =
			await supabase.storage.from('landing-images').list(folderPath, {
				limit: 50,
			});

		if (variantError) {
			console.error('랜딩 이미지 목록 조회 실패:', variantError);
			return [];
		}

		const variantImages =
			variantFiles
				?.map((file) => {
					if (file.name === metadataFileName) {
						return null;
					}
					const path = `${folderPath}/${file.name}`;
					const { data: urlData } = supabase.storage
						.from('landing-images')
						.getPublicUrl(path);
					return {
						name: file.name,
						path,
						publicUrl: urlData.publicUrl,
						createdAt: file.created_at,
						variant,
						linkUrl: metadataByPath.get(path)?.linkUrl ?? null,
					} satisfies LandingImage;
				})
				.filter((item): item is LandingImage => item !== null) ?? [];

		// // 이전 버전과의 호환성을 위해 데스크톱 이미지에 대해 루트 폴더의 파일도 함께 조회합니다.
		// const legacyDesktopImages: LandingImage[] = [];
		// if (variant === "desktop") {
		//   const { data: rootFiles, error: rootError } = await supabase.storage.from("landing-images").list("landing", {
		//     limit: 50,
		//   });

		//   if (!rootError) {
		//     rootFiles
		//       ?.filter((file) => !file.name.includes("/"))
		//       .forEach((file) => {
		//         const path = `landing/${file.name}`;
		//         const { data: urlData } = supabase.storage.from("landing-images").getPublicUrl(path);
		//         legacyDesktopImages.push({
		//           name: file.name,
		//           path,
		//           publicUrl: urlData.publicUrl,
		//           createdAt: file.created_at,
		//           variant: "desktop",
		//           linkUrl: null,
		//         });
		//       });
		//   }
		// }

		const allImages = [...variantImages];
		const metadataOrder = Array.from(metadataByPath.keys());

		return allImages.sort((a, b) => {
			const aIndex = metadataOrder.indexOf(a.path);
			const bIndex = metadataOrder.indexOf(b.path);

			if (aIndex !== -1 || bIndex !== -1) {
				if (aIndex === -1) {
					return 1;
				}
				if (bIndex === -1) {
					return -1;
				}
				return aIndex - bIndex;
			}

			const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return aTime - bTime;
		});
	} catch (error) {
		console.error('랜딩 이미지 정보를 불러오지 못했습니다:', error);
		return [];
	}
}

export async function fetchLatestLandingImage(
	variant: LandingVariant = 'desktop',
): Promise<LandingImage | null> {
	const images = await fetchLandingVariantImages(variant);
	return images[0] ?? null;
}

export async function fetchLandingImages(
	variant: LandingVariant,
): Promise<LandingImage[]> {
	return fetchLandingVariantImages(variant);
}
