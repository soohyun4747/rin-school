import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { COURSE_CATEGORIES, normalizeCourseCategory, type CourseCategory } from '@/lib/course-categories';

type CourseRow = {
	id: string;
	title: string;
	subject: string;
	is_closed: boolean;
};

type ApplicationRow = {
	id: string;
	course_id: string;
	student_id: string;
	created_at: string;
};

type ProfileRow = {
	id: string;
	name: string;
	email: string;
	kakao_id: string | null;
	phone: string | null;
	guardian_name: string | null;
	birthdate: string | null;
	country: string | null;
	student_course: string | null;
};

type MatchRow = {
	course_id: string;
	slot_start_at: string;
	slot_end_at: string;
	match_students: { student_id: string }[] | null;
};

type TimeChoiceRow = {
	application_id: string;
	window: {
		day_of_week: number;
		start_time: string;
		end_time: string;
	} | null;
};

type TimeRequestRow = {
	application_id: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
};

const EXCEL_HEADERS = [
	'학생 이름',
	'이메일',
	'카톡 아이디',
	'연락처',
	'학부모 이름',
	'생년월일',
	'수업명',
	'매칭여부',
	'매칭된 수업 시간대',
	'거주국가',
	'신청일자',
	'재학코스',
	'선택한 시간대',
	'신청한 시간대',
];

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function excelCell(value: string) {
	return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function sanitizeSheetName(name: string) {
	const cleaned = name.replace(/[\\/:*?\[\]]/g, ' ').trim();
	if (!cleaned) return '과목';
	return cleaned.slice(0, 31);
}

function formatDate(value: string) {
	return new Date(value).toLocaleString('ko-KR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

function formatTimeslot(startAt: string, endAt: string) {
	const start = new Date(startAt);
	const end = new Date(endAt);
	const day = start.toLocaleDateString('ko-KR', { weekday: 'short' });
	const date = start.toLocaleDateString('ko-KR');
	const startTime = start.toLocaleTimeString('ko-KR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
	const endTime = end.toLocaleTimeString('ko-KR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
	return `${date} (${day}) ${startTime}~${endTime}`;
}

const days = ['일', '월', '화', '수', '목', '금', '토'];
function formatAvailableWindow(window: { day_of_week: number; start_time: string; end_time: string }) {
	return `${days[window.day_of_week]} ${window.start_time}~${window.end_time}`;
}

export async function GET() {
	const supabase = await getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profile?.role !== 'admin') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const { data: allCourses, error: coursesError } = await supabase
		.from('courses')
		.select('id, title, subject, is_closed')
		.order('display_order', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false });

	if (coursesError) {
		console.error(coursesError);
		return NextResponse.json({ error: '수업 조회에 실패했습니다.' }, { status: 500 });
	}

	const courses = ((allCourses ?? []) as CourseRow[]).filter((course) => !course.is_closed);
	if (courses.length === 0) {
		return NextResponse.json({ error: '다운로드할 진행 중 수업이 없습니다.' }, { status: 400 });
	}

	const { data: allApplications, error: applicationsError } = await supabase
		.from('applications')
		.select('id, course_id, student_id, created_at, status')
		.in('course_id', courses.map((course) => course.id))
		.neq('status', 'cancelled')
		.order('created_at', { ascending: true });

	if (applicationsError) {
		console.error(applicationsError);
		return NextResponse.json({ error: '신청 데이터 조회에 실패했습니다.' }, { status: 500 });
	}

	const applications = (allApplications ?? []) as ApplicationRow[];
	const studentIds = [...new Set(applications.map((application) => application.student_id))];

	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('id, name, email, kakao_id, phone, guardian_name, birthdate, country, student_course')
		.in('id', studentIds.length > 0 ? studentIds : ['']);

	if (profilesError) {
		console.error(profilesError);
		return NextResponse.json({ error: '학생 정보 조회에 실패했습니다.' }, { status: 500 });
	}

	const { data: matches, error: matchesError } = await supabase
		.from('matches')
		.select('course_id, slot_start_at, slot_end_at, match_students(student_id)')
		.in('course_id', courses.map((course) => course.id))
		.neq('status', 'cancelled');

	if (matchesError) {
		console.error(matchesError);
		return NextResponse.json({ error: '매칭 정보 조회에 실패했습니다.' }, { status: 500 });
	}

	const applicationIds = applications.map((application) => application.id);
	const { data: timeChoices, error: timeChoicesError } = await supabase
		.from('application_time_choices')
		.select('application_id, window:course_time_windows(day_of_week, start_time, end_time)')
		.in('application_id', applicationIds.length > 0 ? applicationIds : ['']);

	if (timeChoicesError) {
		console.error(timeChoicesError);
		return NextResponse.json({ error: '신청 시간대 조회에 실패했습니다.' }, { status: 500 });
	}

	const { data: timeRequests, error: timeRequestsError } = await supabase
		.from('application_time_requests')
		.select('application_id, day_of_week, start_time, end_time')
		.in('application_id', applicationIds.length > 0 ? applicationIds : ['']);

	if (timeRequestsError) {
		console.error(timeRequestsError);
		return NextResponse.json({ error: '신청 시간대 조회에 실패했습니다.' }, { status: 500 });
	}

	const profileMap = new Map((profiles ?? []).map((item) => [item.id, item as ProfileRow]));
	const courseMap = new Map(courses.map((course) => [course.id, course]));

	const matchTimeMap = new Map<string, string[]>();
	((matches ?? []) as MatchRow[]).forEach((match) => {
		const label = formatTimeslot(match.slot_start_at, match.slot_end_at);
		(match.match_students ?? []).forEach((matchStudent) => {
			const key = `${match.course_id}:${matchStudent.student_id}`;
			const slots = matchTimeMap.get(key) ?? [];
			slots.push(label);
			matchTimeMap.set(key, slots);
		});
	});

	const availableTimeMap = new Map<string, string[]>();
	((timeChoices ?? []) as TimeChoiceRow[]).forEach((choice) => {
		if (!choice.window) return;
		const label = formatAvailableWindow(choice.window);
		const slots = availableTimeMap.get(choice.application_id) ?? [];
		slots.push(label);
		availableTimeMap.set(choice.application_id, slots);
	});

	const requestedTimeMap = new Map<string, string[]>();
	((timeRequests ?? []) as TimeRequestRow[]).forEach((request) => {
		const label = formatAvailableWindow(request);
		const slots = requestedTimeMap.get(request.application_id) ?? [];
		slots.push(label);
		requestedTimeMap.set(request.application_id, slots);
	});

	const applicationsByCategory = new Map<CourseCategory, { course: CourseRow; app: ApplicationRow }[]>();
	COURSE_CATEGORIES.forEach((category) => {
		applicationsByCategory.set(category, []);
	});
	applications.forEach((application) => {
		const course = courseMap.get(application.course_id);
		if (!course) return;
		const category = normalizeCourseCategory(course.subject);
		const list = applicationsByCategory.get(category) ?? [];
		list.push({ course, app: application });
		applicationsByCategory.set(category, list);
	});

	const worksheetXml = COURSE_CATEGORIES
		.map((category) => {
			const rows = applicationsByCategory.get(category) ?? [];
			const sheetName = sanitizeSheetName(category);
			const xmlRows = [
				`<Row>${EXCEL_HEADERS.map((header) => excelCell(header)).join('')}</Row>`,
				...rows.map(({ course, app }) => {
					const student = profileMap.get(app.student_id);
					const matchKey = `${course.id}:${app.student_id}`;
					const matchedSlots = [...new Set(matchTimeMap.get(matchKey) ?? [])];
					const selectedTimes = [...new Set(availableTimeMap.get(app.id) ?? [])];
					const requestedTimes = [...new Set(requestedTimeMap.get(app.id) ?? [])];
					const cells = [
						student?.name ?? '',
						student?.email ?? '',
						student?.kakao_id ?? '',
						student?.phone ?? '',
						student?.guardian_name ?? '',
						student?.birthdate ?? '',
						course.title,
						matchedSlots.length > 0 ? '매칭됨' : '미매칭',
						matchedSlots.join(', '),
						student?.country ?? '',
						formatDate(app.created_at),
						student?.student_course ?? '',
						selectedTimes.join(', '),
						requestedTimes.join(', '),
					];
					return `<Row>${cells.map((cell) => excelCell(cell)).join('')}</Row>`;
				}),
			].join('');

			return `<Worksheet ss:Name="${escapeXml(sheetName)}"><Table>${xmlRows}</Table></Worksheet>`;
		})
		.join('');

	const workbook = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${worksheetXml}
</Workbook>`;

	const filename = `rin-school-applications-${new Date().toISOString().slice(0, 10)}.xls`;
	return new NextResponse(workbook, {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store',
		},
	});
}
