'use client';

import { useState } from 'react';

export function AdminCourseExportButton() {
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const showToast = (message: string) => {
		setToastMessage(message);
		window.setTimeout(() => setToastMessage(null), 3000);
	};

	const handleExport = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('/admin/courses/export', {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				showToast(
					payload?.error ?? '엑셀 다운로드에 실패했습니다. 다시 시도해주세요.',
				);
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get('content-disposition');
			const filename =
				disposition
					?.match(/filename="(.+)"/)?.[1]
					?.trim() ?? 'rin-school-applications.xls';
			const url = window.URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = filename;
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('course export failed', error);
			showToast('엑셀 다운로드 중 문제가 발생했습니다.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<button
				type='button'
				onClick={handleExport}
				disabled={isLoading}
				className='rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'>
				{isLoading ? '다운로드 중...' : 'Excel 다운로드'}
			</button>
			{toastMessage && (
				<div className='fixed right-4 top-4 z-50 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-lg'>
					{toastMessage}
				</div>
			)}
		</>
	);
}
