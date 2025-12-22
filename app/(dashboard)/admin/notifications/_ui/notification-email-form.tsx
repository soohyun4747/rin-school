'use client';

import { useActionState } from 'react';
import type { AdminNotificationEmailFormState } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
	action: (
		state: AdminNotificationEmailFormState,
		formData: FormData
	) => Promise<AdminNotificationEmailFormState>;
};

export function NotificationEmailForm({ action }: Props) {
	const initialState: AdminNotificationEmailFormState = {};
	const [state, formAction, isPending] = useActionState(
		action,
		initialState
	);

	return (
		<form
			action={formAction}
			className='space-y-3'>
			<div>
				<label className='text-sm font-medium text-slate-700'>
					이메일
				</label>
				<Input
					name='email'
					type='email'
					required
					placeholder='admin@example.com'
				/>
			</div>
			<div>
				<label className='text-sm font-medium text-slate-700'>
					라벨 (선택)
				</label>
				<Input
					name='label'
					placeholder='예: 학사팀, 운영팀'
				/>
			</div>

			{state?.error && (
				<p className='text-sm text-red-600'>{state.error}</p>
			)}
			{state?.success && (
				<p className='text-sm text-green-600'>{state.success}</p>
			)}

			<Button
				type='submit'
				disabled={isPending}
				className='w-full'>
				{isPending ? '저장 중...' : '추가'}
			</Button>
		</form>
	);
}
