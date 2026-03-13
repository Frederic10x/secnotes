import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-border rounded-full p-4 mb-4">
        <Icon size={32} className="text-muted" />
      </div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted mb-4">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="bg-accent hover:bg-[#4F46E5] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
