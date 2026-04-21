'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type StudentOption = {
	id: string;
	name: string;
	email: string | null;
	birthdate: string | null;
	guardian_name: string | null;
};

type StudentSearchPickerProps = {
	students: StudentOption[];
	inputName: string;
	placeholder?: string;
};

const normalize = (value: string | null | undefined) =>
	(value ?? '').toLowerCase();

export default function StudentSearchPicker({
	students,
	inputName,
	placeholder = '이름, 이메일, 보호자 이름으로 검색',
}: StudentSearchPickerProps) {
	const [query, setQuery] = useState('');
	const [selectedId, setSelectedId] = useState('');

	const selectedStudent =
		students.find((student) => student.id === selectedId) ?? null;

	const filteredStudents = useMemo(() => {
		const keyword = normalize(query.trim());
		if (!keyword) {
			return students.slice(0, 12);
		}

		return students
			.filter((student) => {
				const name = normalize(student.name);
				const email = normalize(student.email);
				const guardian = normalize(student.guardian_name);
				return (
					name.includes(keyword) ||
					email.includes(keyword) ||
					guardian.includes(keyword)
				);
			})
			.slice(0, 12);
	}, [query, students]);

	return (
		<div className='w-full space-y-2 sm:w-[32rem]'>
			<input
				name={inputName}
				value={selectedId}
				readOnly
				required
				tabIndex={-1}
				aria-hidden='true'
				className='sr-only'
			/>
			<Input
				value={query}
				onChange={(event) => {
					setQuery(event.target.value);
					setSelectedId('');
				}}
				placeholder={placeholder}
			/>
			<div className='max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white'>
				{filteredStudents.length === 0 ? (
					<p className='px-3 py-2 text-xs text-slate-500'>
						검색 결과가 없습니다.
					</p>
				) : (
					<ul className='divide-y divide-slate-100'>
						{filteredStudents.map((student) => {
							const isSelected = selectedId === student.id;
							return (
								<li key={student.id}>
									<Button
										type='button'
										variant='ghost'
										onClick={() => {
											setSelectedId(student.id);
											setQuery(student.name);
										}}
										className={`h-auto w-full justify-start rounded-none px-3 py-2 text-left ${
											isSelected
												? 'bg-[var(--primary-soft)]'
												: ''
										}`}>
										<div>
											<p className='text-sm font-semibold text-slate-900'>
												{student.name}
											</p>
											<p className='text-xs text-slate-600'>
												{student.email ?? '이메일 없음'} ·{' '}
												{student.birthdate ?? '생년월일 없음'} · 보호자{' '}
												{student.guardian_name ?? '미입력'}
											</p>
										</div>
									</Button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
			{selectedStudent && (
				<p className='text-xs text-slate-600'>
					선택됨: {selectedStudent.name} ({selectedStudent.email ?? '이메일 없음'})
				</p>
			)}
		</div>
	);
}
