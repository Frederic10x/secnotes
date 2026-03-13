'use client';

import Link from 'next/link';
import { Menu, X, ShieldCheck, FolderOpen, Zap, Settings } from 'lucide-react';
import { useSidebarStore } from '@/stores/sidebarStore';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: ShieldCheck },
  { href: '/themes', icon: FolderOpen },
  { href: '/practice', icon: Zap },
  { href: '/settings', icon: Settings },
];

export function MiniRail() {
  const { isOpen, toggle } = useSidebarStore();
  const pathname = usePathname();

  return (
    <div className="lg:hidden w-12 shrink-0 sticky top-0 h-screen flex flex-col bg-surface border-r border-border z-30">
      {/* Toggle */}
      <button
        onClick={toggle}
        className="p-3 flex items-center justify-center text-muted hover:text-text transition-colors cursor-pointer"
        aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Nav icons */}
      <div className="flex flex-col gap-1 mt-1">
        {navItems.map(({ href, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`p-3 mx-1 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'text-accent bg-accent/10'
                  : 'text-muted hover:text-text hover:bg-background'
              }`}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
