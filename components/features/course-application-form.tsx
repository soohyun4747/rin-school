"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

const days = ["일", "월", "화", "수", "목", "금", "토"];

type SlotOption = {
  value: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  instructor_label?: string | null;
};

type SlotGroup = { dayIndex: number; slots: SlotOption[] };

type Props = {
  slotGroups: SlotGroup[];
  hasActiveApplication: boolean;
  action: (formData: FormData) => void | Promise<void>;
  capacity: number;
};

function SubmitButton({
  disabled,
  hasActiveApplication,
}: {
  disabled: boolean;
  hasActiveApplication: boolean;
}) {
  const { pending } = useFormStatus();
  const label = hasActiveApplication
    ? "이미 신청 완료됨"
    : pending
      ? "신청 중..."
      : "신청하기";

  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {label}
    </Button>
  );
}

export function CourseApplicationForm({ slotGroups, hasActiveApplication, action, capacity }: Props) {
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  const totalSlots = useMemo(
    () => slotGroups.reduce((count, group) => count + group.slots.length, 0),
    [slotGroups]
  );

  const handleChange = (value: string, checked: boolean) => {
    setSelectedValues((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(value);
      } else {
        next.delete(value);
      }
      return next;
    });
  };

  const isSubmitDisabled =
    hasActiveApplication || totalSlots === 0 || selectedValues.size === 0;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          가능한 한국 시간대를 선택해주세요. 여러 개를 선택할 수 있습니다.
        </p>
        {totalSlots === 0 && (
          <p className="text-slate-600">관리자가 아직 시간을 등록하지 않았습니다.</p>
        )}
        {slotGroups.map(({ dayIndex, slots }) => (
          <div key={dayIndex} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">{days[dayIndex]}</p>
            <div className="space-y-2">
              {slots.map((slot) => (
                <label
                  key={slot.value}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="window_ids"
                      value={slot.value}
                      className="h-4 w-4 accent-[var(--primary)]"
                      checked={selectedValues.has(slot.value)}
                      onChange={(event) => handleChange(slot.value, event.target.checked)}
                      disabled={hasActiveApplication}
                    />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {slot.start_time} - {slot.end_time}
                      </p>
                      <p className="text-xs text-slate-600">
                        강사: {slot.instructor_label} · 정원 {capacity}명
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-slate-600">선택한 시간 기준으로 신청이 접수됩니다.</p>
      </div>
      <SubmitButton disabled={isSubmitDisabled} hasActiveApplication={hasActiveApplication} />
    </form>
  );
}
