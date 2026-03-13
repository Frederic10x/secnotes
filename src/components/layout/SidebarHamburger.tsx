'use client';
import { Menu, X } from 'lucide-react';
import { useSidebarStore } from '@/stores/sidebarStore';

export function SidebarHamburger() {
  const { isOpen, toggle } = useSidebarStore();

  return (
    <button
      onClick={toggle}
      className="fixed top-4 left-4 z-50 lg:hidden bg-surface border border-border rounded-lg p-2 shadow-sm cursor-pointer"
      aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
    >
      {isOpen ? <X size={20} className="text-text" /> : <Menu size={20} className="text-text" />}
    </button>
  );
}
