import type { Tables } from "@/types/database";

export type TimeWindow = Tables<"course_time_windows">;

export type DayTimeRange = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function minutesFromTimeString(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeStringFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function splitWindowByDuration<T extends { day_of_week: number; start_time: string; end_time: string; instructor_id?: string | null; instructor_name?: string | null }>(
  window: T,
  durationMinutes: number
) {
  const startMinutes = minutesFromTimeString(window.start_time);
  const endMinutes = minutesFromTimeString(window.end_time);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || startMinutes >= endMinutes) {
    throw new Error("시간 범위를 확인해주세요.");
  }

  const total = endMinutes - startMinutes;
  if (total < durationMinutes) {
    throw new Error("수업 길이보다 긴 시간 범위를 입력해주세요.");
  }
  if (total % durationMinutes !== 0) {
    throw new Error("수업 길이(duration_minutes)로 나누어떨어지는 시간 범위만 등록할 수 있습니다.");
  }

  const slots: Array<T & { start_time: string; end_time: string }> = [];
  for (let current = startMinutes; current + durationMinutes <= endMinutes; current += durationMinutes) {
    const slotStart = timeStringFromMinutes(current);
    const slotEnd = timeStringFromMinutes(current + durationMinutes);
    slots.push({ ...window, start_time: slotStart, end_time: slotEnd });
  }

  return slots;
}

export function generateSlotsFromWindows(
  windows: TimeWindow[],
  options: { days?: number; durationMinutes?: number; from?: Date } = {}
) {
  const now = options.from ?? new Date();
  const days = options.days ?? 14;
  const duration = options.durationMinutes ?? 60;
  const slots: { start: Date; end: Date }[] = [];

  for (let offset = 0; offset < days; offset++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(now.getDate() + offset);
    const dow = day.getDay();

    const windowsForDay = windows.filter((w) => w.day_of_week === dow);
    for (const w of windowsForDay) {
      const [startHour, startMinute] = w.start_time.split(":").map(Number);
      const [endHour, endMinute] = w.end_time.split(":").map(Number);
      const dayStart = new Date(day);
      dayStart.setHours(startHour, startMinute, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      let current = new Date(dayStart);
      while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + duration * 60000);
        if (slotStart > new Date()) {
          slots.push({ start: slotStart, end: slotEnd });
        }
        current = new Date(current.getTime() + duration * 60000);
      }
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function formatDateTime(date: Date) {
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNextDateForDay(dayOfWeek: number, reference: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const target = new Date(reference);
  target.setHours(hour, minute, 0, 0);

  const diff = (dayOfWeek + 7 - target.getDay()) % 7;
  if (diff === 0 && target <= reference) {
    target.setDate(target.getDate() + 7);
  } else {
    target.setDate(target.getDate() + diff);
  }

  return target;
}

export function combineDayAndTime(dayOfWeek: number, time: string, reference: Date) {
  const [hour, minute] = time.split(":").map(Number);
  const day = new Date(reference);
  day.setHours(hour, minute, 0, 0);
  const diff = (dayOfWeek + 7 - day.getDay()) % 7;
  day.setDate(day.getDate() + diff);
  return day;
}

export function buildSlotsFromDayTimeRanges(ranges: DayTimeRange[], options: { referenceDate?: Date } = {}) {
  const reference = options.referenceDate ?? new Date();

  return ranges
    .map((range) => {
      if (
        Number.isNaN(range.day_of_week) ||
        range.day_of_week < 0 ||
        range.day_of_week > 6 ||
        !range.start_time ||
        !range.end_time
      ) {
        return null;
      }

      const [startHour, startMinute] = range.start_time.split(":").map(Number);
      const [endHour, endMinute] = range.end_time.split(":").map(Number);
      if (
        Number.isNaN(startHour) ||
        Number.isNaN(startMinute) ||
        Number.isNaN(endHour) ||
        Number.isNaN(endMinute)
      ) {
        return null;
      }

      const startAt = getNextDateForDay(range.day_of_week, reference, range.start_time);
      const endAt = getNextDateForDay(range.day_of_week, reference, range.end_time);

      if (startAt >= endAt) return null;

      return {
        start: startAt.toISOString(),
        end: endAt.toISOString(),
      };
    })
    .filter(Boolean) as { start: string; end: string }[];
}

export function generateWindowOccurrences(
  windows: { windowId: string; day_of_week: number; start_time: string; end_time: string }[],
  options: { from: Date; to: Date }
) {
  const occurrences: { windowId: string; start: Date; end: Date }[] = [];
  const start = new Date(options.from);
  const endBoundary = new Date(options.to);
  start.setHours(0, 0, 0, 0);
  endBoundary.setHours(23, 59, 59, 999);

  for (let day = new Date(start); day <= endBoundary; day.setDate(day.getDate() + 1)) {
    const dow = day.getDay();
    const matching = windows.filter((w) => w.day_of_week === dow);
    matching.forEach((w) => {
      const startAt = new Date(day);
      const endAt = new Date(day);
      const [sh, sm] = w.start_time.split(":").map(Number);
      const [eh, em] = w.end_time.split(":").map(Number);
      startAt.setHours(sh, sm, 0, 0);
      endAt.setHours(eh, em, 0, 0);
      if (startAt >= options.from && endAt <= endBoundary) {
        occurrences.push({ windowId: w.windowId, start: startAt, end: endAt });
      }
    });
  }

  return occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export const toHHMM = (t: string) => t.slice(0, 5);