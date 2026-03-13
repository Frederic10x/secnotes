'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle } from 'lucide-react';
import { markAsRead } from '@/actions/fiches';

interface FicheBottomBarProps {
  ficheId: string;
  isRead: boolean;
  readAt: string | null;
  prevFiche: { slug: string; title: string; fullPath: string } | null;
  nextFiche: { slug: string; title: string; fullPath: string } | null;
  fichePath: string;
}

function formatDateFr(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export default function FicheBottomBar({
  ficheId,
  isRead,
  readAt,
  prevFiche,
  nextFiche,
  fichePath,
}: FicheBottomBarProps) {
  const [isReadState, setIsReadState] = useState(isRead);
  const [readAtState, setReadAtState] = useState(readAt);

  async function handleMarkAsRead() {
    setIsReadState(true);
    setReadAtState(new Date().toISOString());
    await markAsRead(ficheId, fichePath);
  }

  return (
    <div className="fixed bottom-0 z-30 left-12 right-0 lg:left-[220px] h-16 bg-surface/95 backdrop-blur border-t border-border">
      <div className="flex items-center justify-between px-8 h-full">
        {/* LEFT: previous fiche */}
        {prevFiche ? (
          <Link
            href={prevFiche.fullPath}
            className="text-muted hover:text-text text-sm transition-colors"
          >
            ← {prevFiche.title}
          </Link>
        ) : (
          <div />
        )}

        {/* CENTER: mark as read / read indicator */}
        {!isReadState ? (
          <button
            onClick={handleMarkAsRead}
            className="flex items-center gap-2 bg-accent hover:bg-[#4F46E5] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <BookOpen size={16} />
            Marquer comme lu
          </button>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2 border border-border text-success text-sm font-medium px-5 py-2 rounded-lg">
              <CheckCircle size={16} />
              Lu ✓
            </div>
            {readAtState && (
              <span className="text-muted text-xs">le {formatDateFr(readAtState)}</span>
            )}
          </div>
        )}

        {/* RIGHT: next fiche */}
        {nextFiche ? (
          <Link
            href={nextFiche.fullPath}
            className="text-muted hover:text-text text-sm transition-colors"
          >
            {nextFiche.title} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
