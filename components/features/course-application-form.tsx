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
  const [customSlots, setCustomSlots] = useState([
    { day_of_week: 1, start_time: "", end_time: "" },
  ]);

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

  const hasCustomSelection = customSlots.some(
    (slot) => slot.start_time && slot.end_time
  );

  const isSubmitDisabled =
    hasActiveApplication ||
    (!hasCustomSelection && selectedValues.size === 0);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          가능한 한국 시간대를 선택해주세요. 여러 개를 선택할 수 있습니다.
        </p>
        {totalSlots === 0 && (
          <div className="space-y-2 text-sm text-slate-600">
            <p>관리자가 아직 시간을 등록하지 않았습니다.</p>
            <p>가능한 시간대를 직접 입력해서 신청할 수 있습니다.</p>
          </div>
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
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-800">
            시간 신청
          </p>
          {totalSlots > 0 && (
            <p className="text-xs text-slate-600">
              가능한 시간대가 없는 경우 시간대를 신청해주시면 연락드리겠습니다.
            </p>
          )}
            <div className="space-y-3">
              {customSlots.map((slot, index) => (
                <div
                  key={`custom-slot-${index}`}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <select
                    name="custom_day_of_week"
                    className="h-9 rounded-md border border-slate-200 px-2"
                    value={slot.day_of_week}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setCustomSlots((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, day_of_week: next } : item
                        )
                      );
                    }}
                    disabled={hasActiveApplication}
                  >
                    {days.map((label, dayIndex) => (
                      <option key={`custom-day-${dayIndex}`} value={dayIndex}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    name="custom_start_time"
                    className="h-9 rounded-md border border-slate-200 px-2"
                    value={slot.start_time}
                    onChange={(event) => {
                      const next = event.target.value;
                      setCustomSlots((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, start_time: next } : item
                        )
                      );
                    }}
                    disabled={hasActiveApplication}
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="time"
                    name="custom_end_time"
                    className="h-9 rounded-md border border-slate-200 px-2"
                    value={slot.end_time}
                    onChange={(event) => {
                      const next = event.target.value;
                      setCustomSlots((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, end_time: next } : item
                        )
                      );
                    }}
                    disabled={hasActiveApplication}
                  />
                  {customSlots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 px-2 text-xs text-slate-500"
                      onClick={() =>
                        setCustomSlots((prev) =>
                          prev.filter((_, idx) => idx !== index)
                        )
                      }
                      disabled={hasActiveApplication}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() =>
                setCustomSlots((prev) => [
                  ...prev,
                  { day_of_week: 1, start_time: "", end_time: "" },
                ])
              }
              disabled={hasActiveApplication}
            >
              시간 추가
            </Button>
          </div>
        <p className="text-xs text-slate-600">선택한 시간 기준으로 신청이 접수됩니다.</p>
      </div>
      <SubmitButton disabled={isSubmitDisabled} hasActiveApplication={hasActiveApplication} />
    </form>
  );
}
