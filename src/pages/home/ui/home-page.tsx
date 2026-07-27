import { Button } from '@/shared/ui/button';

export const HomePage = () => {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Core Bank</h1>
        <p className="text-muted-foreground">프론트엔드 초기 설정이 완료되었습니다.</p>

        <Button>계좌 조회</Button>
      </div>
    </main>
  );
};
