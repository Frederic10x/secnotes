import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle';
}

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    card: 'h-32 w-full rounded-xl',
    circle: 'h-10 w-10 rounded-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-surface',
        variantClasses[variant],
        className,
      )}
    />
  );
}
