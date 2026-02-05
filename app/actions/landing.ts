'use server';

import { revalidatePath } from "next/cache";
import { requireRole, requireSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type LandingVariant = "desktop" | "mobile";

type LandingImageMetadata = {
  path: string;
  linkUrl: string | null;
};

const metadataFileName = "metadata.json";

function parseVariant(formData: FormData): LandingVariant {
  const variant = formData.get("variant");
  return variant === "mobile" ? "mobile" : "desktop";
}

function normalizeLinkUrl(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

async function readLandingMetadata(variant: LandingVariant): Promise<LandingImageMetadata[]> {
  const supabase = await getSupabaseServerClient();
  const metadataPath = `landing/${variant}/${metadataFileName}`;
  const { data, error } = await supabase.storage.from("landing-images").download(metadataPath);

  if (error || !data) {
    return [];
  }

  try {
    const rawText = await data.text();
    const parsed = JSON.parse(rawText) as { images?: LandingImageMetadata[] };
    return parsed.images ?? [];
  } catch (parseError) {
    console.error("랜딩 메타데이터 파싱 실패:", parseError);
    return [];
  }
}

async function writeLandingMetadata(variant: LandingVariant, images: LandingImageMetadata[]) {
  const supabase = await getSupabaseServerClient();
  const metadataPath = `landing/${variant}/${metadataFileName}`;
  const payload = JSON.stringify({ images }, null, 2);

  const { error } = await supabase.storage.from("landing-images").upload(metadataPath, payload, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });

  if (error) {
    console.error("랜딩 메타데이터 저장 실패:", error);
    throw new Error("랜딩 이미지 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}

export async function uploadLandingImage(formData: FormData) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["admin"]);
  const supabase = await getSupabaseServerClient();

  const variant = parseVariant(formData);
  const linkUrl = normalizeLinkUrl(formData.get("linkUrl"));
  const image = formData.get("image");

  if (!(image instanceof File) || image.size === 0) {
    throw new Error("업로드할 이미지를 선택해주세요.");
  }

  if (image.type && !image.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const extension = image.name.split(".").pop() || "png";
  const fileName = `${crypto.randomUUID?.() ?? Date.now().toString()}.${extension}`;
  const folderPath = `landing/${variant}`;
  const filePath = `${folderPath}/${fileName}`;

  const { error } = await supabase.storage.from("landing-images").upload(filePath, image, {
    cacheControl: "3600",
    upsert: false,
    contentType: image.type || undefined,
  });

  if (error) {
    console.error("랜딩 이미지 업로드 실패:", error);
    throw new Error("이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  const metadata = await readLandingMetadata(variant);
  metadata.push({ path: filePath, linkUrl });
  await writeLandingMetadata(variant, metadata);

  revalidatePath("/");
  revalidatePath("/admin/landing");
}

export async function deleteLandingImage(path: string, variant: LandingVariant) {
  const { profile } = await requireSession();
  requireRole(profile.role, ["admin"]);
  const supabase = await getSupabaseServerClient();

  if (!path.startsWith("landing/")) {
    throw new Error("잘못된 파일 경로입니다.");
  }

  const { error } = await supabase.storage.from("landing-images").remove([path]);

  if (error) {
    console.error("랜딩 이미지 삭제 실패:", error);
    throw new Error("이미지를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  const metadata = await readLandingMetadata(variant);
  await writeLandingMetadata(
    variant,
    metadata.filter((item) => item.path !== path),
  );

  revalidatePath("/");
  revalidatePath("/admin/landing");
}
