import type { Tables } from '@/types/database';

export type TimeWindow = Tables<'course_time_windows'>;

export type DayTimeRange = {
	day_of_week: number;
	start_time: string;
	end_time: string;
};

function minutesFromTimeString(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
}

function timeStringFromMinutes(totalMinutes: number) {
	const hours = Math.floor(totalMinutes / 60)
		.toString()
		.padStart(2, '0');
	const minutes = (totalMinutes % 60).toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

export function splitWindowByDuration<
	T extends {
		day_of_week: number;
		start_time: string;
		end_time: string;
		instructor_id?: string | null;
		instructor_name?: string | null;
	},
>(window: T, durationMinutes: number) {
	const startMinutes = minutesFromTimeString(window.start_time);
	const endMinutes = minutesFromTimeString(window.end_time);

	if (
		Number.isNaN(startMinutes) ||
		Number.isNaN(endMinutes) ||
		startMinutes >= endMinutes
	) {
		throw new Error('시간 범위를 확인해주세요.');
	}

	const total = endMinutes - startMinutes;
	const isOneHourAlmostFullRange =
		durationMinutes === 60 &&
		total === 59 &&
		startMinutes % 60 === 0 &&
		endMinutes % 60 === 59;
	const isNinetyMinutesLateNightRange =
		durationMinutes === 90 &&
		total === 89 &&
		startMinutes % 60 === 30 &&
		endMinutes % 60 === 59;
	if (total < durationMinutes) {
		if (isOneHourAlmostFullRange || isNinetyMinutesLateNightRange) {
			return [window];
		}
		throw new Error('수업 길이보다 긴 시간 범위를 입력해주세요.');
	}
	if (total % durationMinutes !== 0) {
		throw new Error(
			'수업 길이(duration_minutes)로 나누어떨어지는 시간 범위만 등록할 수 있습니다.',
		);
	}

	const slots: Array<T & { start_time: string; end_time: string }> = [];
	for (
		let current = startMinutes;
		current + durationMinutes <= endMinutes;
		current += durationMinutes
	) {
		const slotStart = timeStringFromMinutes(current);
		const slotEnd = timeStringFromMinutes(current + durationMinutes);
		slots.push({ ...window, start_time: slotStart, end_time: slotEnd });
	}

	return slots;
}

export function generateSlotsFromWindows(
	windows: TimeWindow[],
	options: { days?: number; durationMinutes?: number; from?: Date } = {},
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
			const [startHour, startMinute] = w.start_time
				.split(':')
				.map(Number);
			const [endHour, endMinute] = w.end_time.split(':').map(Number);
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
	return date.toLocaleString('ko-KR', {
		timeZone: 'Asia/Seoul',
		month: 'short',
		day: 'numeric',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

export function formatDayTime(date: Date) {
	return date.toLocaleString('ko-KR', {
		timeZone: 'Asia/Seoul',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

function getNextDateForDay(dayOfWeek: number, reference: Date, time: string) {
	const [hour, minute] = time.split(':').map(Number);
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

// ✅ 서버 타임존(UTC)과 무관하게 "KST 기준 요일+시간"을 정확한 Date로 만들어줌
const KST_OFFSET_MINUTES = 9 * 60;

export function combineDayAndTime(
	dayOfWeek: number, // 0=Sun ... 6=Sat (JS 기준)
	timeStr: string, // "22:00:00" or "22:00"
	reference: Date, // 기준(현재)
) {
	const [hh, mm = '0', ss = '0'] = timeStr.split(':');
	const h = Number(hh);
	const m = Number(mm);
	const s = Number(ss);

	// reference를 KST로 "해석"하기 위해 +9시간 한 뒤 UTC getter로 뽑아냄
	const refKst = new Date(reference.getTime() + KST_OFFSET_MINUTES * 60_000);
	const refY = refKst.getUTCFullYear();
	const refM = refKst.getUTCMonth();
	const refD = refKst.getUTCDate();
	const refDow = refKst.getUTCDay(); // KST에서의 요일

	// reference(KST) 기준으로 target 요일까지의 차이(0~6)
	const diffDays = (dayOfWeek - refDow + 7) % 7;

	// "KST 자정"을 UTC timestamp로 환산한 기준점
	const kstMidnightUtcMs =
		Date.UTC(refY, refM, refD) - KST_OFFSET_MINUTES * 60_000;

	// target day + time(KST)를 UTC ms로 만들기
	const targetUtcMs =
		kstMidnightUtcMs +
		diffDays * 24 * 60 * 60_000 +
		h * 60 * 60_000 +
		m * 60_000 +
		s * 1_000;

	return new Date(targetUtcMs);
}

export function buildSlotsFromDayTimeRanges(
	ranges: DayTimeRange[],
	options: { referenceDate?: Date } = {},
) {
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

			const [startHour, startMinute] = range.start_time
				.split(':')
				.map(Number);
			const [endHour, endMinute] = range.end_time.split(':').map(Number);
			if (
				Number.isNaN(startHour) ||
				Number.isNaN(startMinute) ||
				Number.isNaN(endHour) ||
				Number.isNaN(endMinute)
			) {
				return null;
			}

			const startAt = getNextDateForDay(
				range.day_of_week,
				reference,
				range.start_time,
			);
			const endAt = getNextDateForDay(
				range.day_of_week,
				reference,
				range.end_time,
			);

			if (startAt >= endAt) return null;

			return {
				start: startAt.toISOString(),
				end: endAt.toISOString(),
			};
		})
		.filter(Boolean) as { start: string; end: string }[];
}

export function generateWindowOccurrences(
	windows: {
		windowId: string;
		day_of_week: number;
		start_time: string;
		end_time: string;
	}[],
	options: { from: Date; to: Date },
) {
	const occurrences: { windowId: string; start: Date; end: Date }[] = [];
	const start = new Date(options.from);
	const endBoundary = new Date(options.to);
	start.setHours(0, 0, 0, 0);
	endBoundary.setHours(23, 59, 59, 999);

	for (
		let day = new Date(start);
		day <= endBoundary;
		day.setDate(day.getDate() + 1)
	) {
		const dow = day.getDay();
		const matching = windows.filter((w) => w.day_of_week === dow);
		matching.forEach((w) => {
			const startAt = new Date(day);
			const endAt = new Date(day);
			const [sh, sm] = w.start_time.split(':').map(Number);
			const [eh, em] = w.end_time.split(':').map(Number);
			startAt.setHours(sh, sm, 0, 0);
			endAt.setHours(eh, em, 0, 0);
			if (startAt >= options.from && endAt <= endBoundary) {
				occurrences.push({
					windowId: w.windowId,
					start: startAt,
					end: endAt,
				});
			}
		});
	}

	return occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export const toHHMM = (t: string) => t.slice(0, 5);

export function trimSeconds(time: string) {
	// "20:00:00" -> "20:00"
	return time.slice(0, 5);
}
