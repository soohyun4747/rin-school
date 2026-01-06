"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CourseScheduleFields } from "./course-schedule-fields";

type InstructorOption = { id: string; name: string | null; email: string | null };

interface Props {
  instructors: InstructorOption[];
}

export function CourseCreateModal({ instructors }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>수업 등록</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="absolute inset-0" onClick={() => setOpen(false)} aria-hidden="true" />
          <CourseCreateForm instructors={instructors} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

function CourseCreateForm({ instructors, onClose }: Props & { onClose: () => void }) {
  const initialState = { success: false, error: undefined as string | undefined };
  const [state, formAction, isPending] = useActionState(createCourse, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
  }, [state?.success, onClose, router]);

  return (
    <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">수업 등록</h2>
        <button
          type="button"
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <div className="p-5">
        <form action={formAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">수업명</label>
                <Input name="title" placeholder="예: 중등 수학 심화" required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">과목</label>
                <Input name="subject" placeholder="수학" required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">학년 범위</label>
                <Input name="grade_range" placeholder="중1-중3" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">정원</label>
                  <Input name="capacity" type="number" min={1} defaultValue={4} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">수업 시간(분)</label>
                  <Select name="duration_minutes" defaultValue="60">
                    <option value="60">60분</option>
                    <option value="90">90분</option>
                  </Select>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">수업 소개</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="수업 목표, 수업 방식 등 간단한 소개를 적어주세요."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-[var(--primary)]"
                />
                <p className="mt-1 text-xs text-slate-500">수업 목록과 학생 페이지에 표시됩니다.</p>
              </div>
            </CardContent>
          </Card>

          <CourseScheduleFields instructors={instructors} />

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>이미지</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="text-sm font-medium text-slate-700">대표 이미지 (선택)</label>
              <Input name="image" type="file" accept="image/*" />
              <p className="text-xs text-slate-500">수업 소개에 사용됩니다. (JPG, PNG 등 이미지 파일)</p>
            </CardContent>
          </Card>

          {state?.error && (
            <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
              {state.error}
            </div>
          )}

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
