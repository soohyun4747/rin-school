import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignupCompletePage() {
  return (
    <div className='flex min-h-[70vh] flex-1 items-center justify-center bg-slate-50 py-12'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>회원가입 완료</CardTitle>
          <p className='text-sm text-slate-600'>회원가입이 정상적으로 완료되었습니다.</p>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-slate-600'>아래 버튼을 눌러 로그인 페이지로 이동해주세요.</p>
          <Button aschild className='w-full'>
            <Link href='/auth/login'>로그인하러가기</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
