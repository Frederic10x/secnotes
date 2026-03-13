'use client';

import { Search } from 'lucide-react';

export default function SidebarSearchButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
      className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-[13px] text-muted hover:text-text hover:bg-background transition-colors duration-150 cursor-pointer"
      aria-label="Ouvrir la recherche"
    >
      <Search size={14} className="shrink-0" />
      <span className="flex-1 text-left">Rechercher</span>
      <kbd className="text-[10px] bg-border text-muted px-1.5 py-0.5 rounded font-mono">
        ⌘K
      </kbd>
    </button>
  );
}
