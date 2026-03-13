'use client';
import { useSidebarStore } from '@/stores/sidebarStore';

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebarStore();

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 w-[220px] flex flex-col bg-surface border-r border-border z-50 overflow-hidden transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Navigation principale"
    >
      {children}
    </aside>
  );
}
