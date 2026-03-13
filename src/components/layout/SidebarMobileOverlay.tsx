'use client';
import { useSidebarStore } from '@/stores/sidebarStore';

export function SidebarMobileOverlay() {
  const { isOpen, close } = useSidebarStore();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 lg:hidden"
      onClick={close}
      aria-hidden
    />
  );
}
