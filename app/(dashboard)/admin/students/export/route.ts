import { NextResponse } from 'next/server';

import { getSessionAndProfile } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type StudentExportRow = {
	username: string | null;
	name: string;
	email: string;
	phone: string | null;
	birthdate: string | null;
	kakao_id: string | null;
	country: string | null;
	guardian_name: string | null;
	student_course: string | null;
	created_at: string;
};

const excelXmlEscape = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

const buildCell = (value: string) =>
	`<Cell><Data ss:Type="String">${excelXmlEscape(value)}</Data></Cell>`;


const formatStudentCourse = (studentCourse: string | null) => {
	switch (studentCourse) {
		case 'international_school':
			return '국제학교';
		case 'local_school':
			return '현지학교';
		case 'homeschool':
			return '홈스쿨';
		default:
			return '미입력';
	}
};

const buildExcelXml = (rows: StudentExportRow[]) => {
	const headerCells = [
		'이름',
		'아이디',
		'이메일',
		'연락처',
		'생년월일',
		'카카오톡 ID',
		'거주지',
		'학부모 이름',
		'재학코스',
		'가입일',
	].map(buildCell);

	const bodyRows = rows
		.map((student) => {
			const values = [
				student.name || '이름 미입력',
				student.username || '아이디 없음',
				student.email,
				student.phone || '연락처 없음',
				student.birthdate || '미입력',
				student.kakao_id || '미입력',
				student.country || '미입력',
				student.guardian_name || '미입력',
				formatStudentCourse(student.student_course),
				student.created_at,
			];

			return `<Row>${values.map(buildCell).join('')}</Row>`;
		})
		.join('');

	return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="학생목록">
  <Table>
   <Row>${headerCells.join('')}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
};

const getAllStudents = async () => {
	const supabase = await getSupabaseServerClient();
	const batchSize = 1000;
	let from = 0;
	const students: StudentExportRow[] = [];

	while (true) {
		const { data, error } = await supabase
			.from('profiles')
			.select(
				'username, name, email, phone, birthdate, kakao_id, country, guardian_name, student_course, created_at'
			)
			.eq('role', 'student')
			.order('created_at', { ascending: false })
			.range(from, from + batchSize - 1);

		if (error) {
			throw error;
		}

		if (!data || data.length === 0) {
			break;
		}

		students.push(...data);
		if (data.length < batchSize) {
			break;
		}
		from += batchSize;
	}

	return students;
};

export async function GET() {
	const { session, profile } = await getSessionAndProfile();

	if (!session || !profile || profile.role !== 'admin') {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const students = await getAllStudents();
		const xml = buildExcelXml(students);
		const dateLabel = new Date().toISOString().slice(0, 10);

		return new NextResponse(xml, {
			headers: {
				'Content-Type':
					'application/vnd.ms-excel; charset=utf-8',
				'Content-Disposition': `attachment; filename="students-${dateLabel}.xls"`,
			},
		});
	} catch (error) {
		console.error('학생 엑셀 다운로드 생성 실패', error);
		return NextResponse.json(
			{ error: '엑셀 파일 생성에 실패했습니다.' },
			{ status: 500 }
		);
	}
}
