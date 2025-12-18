import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // ✅ 서버 컴포넌트/서버에서만 쓸 거면 서비스 롤도 가능하지만,
    // 일반적인 auth(세션/유저) 용도면 anon(or publishable) 키 권장입니다.
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 setAll이 호출되면 실패할 수 있는데,
            // Supabase Proxy(미들웨어)로 세션 갱신을 처리한다면 무시해도 됩니다.
          }
        },
      },
    }
  );
}
