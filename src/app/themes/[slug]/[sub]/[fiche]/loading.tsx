import { Skeleton } from '@/components/ui/Skeleton';

export default function FicheLoading() {
  return (
    <div className="px-4 md:px-8 py-6 max-w-screen-xl mx-auto">
      <Skeleton className="h-4 w-64 mb-4" />
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} variant="text" className={i % 3 === 2 ? 'w-3/4' : 'w-full'} />
        ))}
      </div>
    </div>
  );
}
