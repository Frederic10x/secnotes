import { Skeleton } from '@/components/ui/Skeleton';

export default function SubThemeLoading() {
  return (
    <div className="p-4 md:p-8 max-w-screen-xl mx-auto">
      <Skeleton className="h-5 w-64 mb-6" />
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-2 w-full max-w-md mb-8" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
