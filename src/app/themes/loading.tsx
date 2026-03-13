import { Skeleton } from '@/components/ui/Skeleton';

export default function ThemesLoading() {
  return (
    <div className="p-4 md:p-8 max-w-screen-xl mx-auto">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}
