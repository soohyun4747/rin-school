export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const statusMap: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: '신청됨',
    className: 'text-blue-600',
  },
  matched: {
    label: '매칭완료',
    className: 'text-green-600',
  },
  cancelled: {
    label: '취소됨',
    className: 'text-red-600',
  },
};
