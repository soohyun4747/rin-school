"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const roles = [
  { value: "student", label: "학생" },
  { value: "instructor", label: "강사" },
  { value: "admin", label: "관리자" },
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    setError(null);
    setMessage(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name, phone },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setMessage("회원가입이 완료되었습니다. 로그인해 주세요.");
    router.push("/auth/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <p className="text-sm text-slate-600">역할과 기본 정보를 입력해주세요.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">이메일</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">비밀번호</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">연락처</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="선택" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">역할</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <Button type="submit" className="w-full">
              회원가입
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-600">
            이미 계정이 있나요?{" "}
            <Link href="/auth/login" className="text-[var(--primary)] hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
