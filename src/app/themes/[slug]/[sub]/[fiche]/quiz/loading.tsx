import { Skeleton } from '@/components/ui/Skeleton';

export default function QuizLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-xl flex flex-col gap-4">
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton variant="card" className="h-48" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
