'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { FileText, Brain, ChevronRight, Search, SearchX } from 'lucide-react';
import { globalSearch, type SearchResult } from '@/actions/search';

const QUALITY_LABELS: Record<number, { label: string; className: string }> = {
  0: { label: 'À revoir', className: 'bg-danger/20 text-danger' },
  1: { label: 'Difficile', className: 'bg-warning/20 text-warning' },
  2: { label: 'Bien', className: 'bg-success/20 text-success' },
  3: { label: 'Facile', className: 'bg-teal/20 text-teal' },
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState('');
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Custom event from sidebar button
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setActiveId('');
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await globalSearch(query);
      setResults(res);
      setLoading(false);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  if (!open) return null;

  const fiches = results.filter((r) => r.type === 'fiche');
  const flashcards = results.filter((r) => r.type === 'flashcard');
  const tags = results.filter((r) => r.type === 'tag');
  const hasResults = results.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-surface border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          onValueChange={setActiveId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          {/* ── Input ────────────────────────────────────────────────── */}
          <div className="flex items-center px-4 py-3 border-b border-border gap-3">
            <Search size={16} className="text-muted shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Rechercher une fiche, flashcard, tag..."
              className="flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
              autoFocus
            />
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="text-[10px] bg-background border border-border text-muted px-1.5 py-0.5 rounded font-mono">
                ESC
              </kbd>
              <span className="text-xs text-muted">pour fermer</span>
            </div>
          </div>

          {/* ── Results list ─────────────────────────────────────────── */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {/* Empty — no query */}
            {!query.trim() && (
              <div className="py-8 text-center">
                <p className="text-muted text-sm">Tapez pour rechercher dans vos fiches...</p>
              </div>
            )}

            {/* Loading skeletons */}
            {query.trim() && loading && (
              <div className="py-2 flex flex-col gap-2 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-border animate-pulse rounded-lg" />
                ))}
              </div>
            )}

            {/* No results */}
            {query.trim() && !loading && !hasResults && (
              <div className="flex flex-col items-center py-8 gap-2 text-muted">
                <SearchX size={20} />
                <p className="text-sm">Aucun résultat pour &quot;{query}&quot;</p>
              </div>
            )}

            {/* ── FICHES ───────────────────────────────────────────── */}
            {fiches.length > 0 && (
              <>
                <p className="text-[10px] uppercase font-semibold tracking-widest text-muted px-3 py-1.5 mt-1">
                  Fiches
                </p>
                {fiches.map((r) => {
                  const isActive = activeId === r.id;
                  return (
                    <Command.Item
                      key={r.id}
                      value={r.id}
                      onSelect={() => handleSelect(r.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-l-[3px] transition-colors duration-100 ${
                        isActive
                          ? 'border-l-accent bg-background'
                          : 'border-l-transparent hover:bg-background/60'
                      }`}
                    >
                      <FileText size={16} className="text-muted shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text">{r.title}</span>
                          {r.breadcrumb && (
                            <span className="text-xs font-mono text-muted truncate">
                              {r.breadcrumb}
                            </span>
                          )}
                        </div>
                        {r.tagObjects.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {r.tagObjects.map((tag) => (
                              <span
                                key={tag.name}
                                className="text-xs rounded-full px-2 py-0.5 font-mono"
                                style={{
                                  backgroundColor: tag.color + '33',
                                  color: tag.color,
                                }}
                              >
                                #{tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <ChevronRight size={14} className="text-muted shrink-0" />
                      )}
                    </Command.Item>
                  );
                })}
              </>
            )}

            {/* ── FLASHCARDS ───────────────────────────────────────── */}
            {flashcards.length > 0 && (
              <>
                <p className="text-[10px] uppercase font-semibold tracking-widest text-muted px-3 py-1.5 mt-1">
                  Flashcards
                </p>
                {flashcards.map((r) => {
                  const isActive = activeId === r.id;
                  const quality =
                    r.lastQuality !== null ? QUALITY_LABELS[r.lastQuality] : null;
                  return (
                    <Command.Item
                      key={r.id}
                      value={r.id}
                      onSelect={() => handleSelect(r.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-l-[3px] transition-colors duration-100 ${
                        isActive
                          ? 'border-l-accent bg-background'
                          : 'border-l-transparent hover:bg-background/60'
                      }`}
                    >
                      <Brain size={16} className="text-muted shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text truncate">{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {r.breadcrumb && (
                            <span className="text-xs font-mono text-muted">
                              Source: {r.breadcrumb}
                            </span>
                          )}
                          {quality && (
                            <span
                              className={`text-xs rounded px-2 py-0.5 font-semibold uppercase tracking-wide ${quality.className}`}
                            >
                              {quality.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight size={14} className="text-muted shrink-0" />
                      )}
                    </Command.Item>
                  );
                })}
              </>
            )}

            {/* ── TAGS ─────────────────────────────────────────────── */}
            {tags.length > 0 && (
              <>
                <p className="text-[10px] uppercase font-semibold tracking-widest text-muted px-3 py-1.5 mt-1">
                  Tags
                </p>
                {tags.map((r) => {
                  const isActive = activeId === r.id;
                  return (
                    <Command.Item
                      key={r.id}
                      value={r.id}
                      onSelect={() => handleSelect(r.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-l-[3px] transition-colors duration-100 ${
                        isActive
                          ? 'border-l-accent bg-background'
                          : 'border-l-transparent hover:bg-background/60'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: r.tagColor }}
                      />
                      <span
                        className="text-xs rounded-full px-2 py-0.5 font-mono"
                        style={{
                          backgroundColor: r.tagColor + '33',
                          color: r.tagColor,
                        }}
                      >
                        #{r.title}
                      </span>
                      <span className="text-muted text-sm">{r.ficheCount} fiches associées</span>
                      {isActive && (
                        <ChevronRight size={14} className="text-muted shrink-0 ml-auto" />
                      )}
                    </Command.Item>
                  );
                })}
              </>
            )}
          </Command.List>

          {/* ── Bottom keyboard hints ─────────────────────────────── */}
          <div className="flex items-center gap-2 border-t border-border px-4 py-2 shrink-0 flex-wrap">
            <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text">
              ↑
            </kbd>
            <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text">
              ↓
            </kbd>
            <span className="text-muted text-xs">naviguer</span>
            <span className="text-muted text-xs">·</span>
            <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text">
              ↵
            </kbd>
            <span className="text-muted text-xs">ouvrir</span>
            <span className="text-muted text-xs">·</span>
            <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text">
              ✕
            </kbd>
            <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text">
              K
            </kbd>
            <span className="text-muted text-xs">pour fermer</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
