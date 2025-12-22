import { getSupabaseServerClient } from "@/lib/supabase/server";

export type LandingImage = {
  name: string;
  path: string;
  publicUrl: string;
  createdAt?: string;
};

export async function fetchLandingImages(): Promise<LandingImage[]> {
  const hasSupabaseEnv = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabaseEnv) {
    return [];
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.storage.from("landing-images").list("landing", {
      limit: 50,
    });

    if (error) {
      console.error("랜딩 이미지 목록 조회 실패:", error);
      return [];
    }

    const withUrls =
      data?.map((file) => {
        const { data: urlData } = supabase.storage.from("landing-images").getPublicUrl(`landing/${file.name}`);
        return {
          name: file.name,
          path: `landing/${file.name}`,
          publicUrl: urlData.publicUrl,
          createdAt: file.created_at,
        };
      }) ?? [];

    return withUrls.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("랜딩 이미지 정보를 불러오지 못했습니다:", error);
    return [];
  }

}

export async function fetchLatestLandingImage(): Promise<LandingImage | null> {
  const images = await fetchLandingImages();
  return images[0] ?? null;
}
