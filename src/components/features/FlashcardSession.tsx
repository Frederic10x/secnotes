'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, ExternalLink } from 'lucide-react';
import type { Flashcard } from '@/types';
import FlashcardCard from './FlashcardCard';
import { updateFlashcard } from '@/actions/flashcards';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export type SessionCard = Flashcard & {
  nodeTitle: string;
  nodeColor: string;
  ficheSlug: string;
  subSlug: string;
  themeSlug: string;
};

interface FlashcardSessionProps {
  cards: SessionCard[];
  nextReviewDate: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function previewInterval(easeFactor: number, intervalDays: number, quality: 0 | 1 | 2 | 3): string {
  if (quality === 0) return '10 min';
  const q = [0, 2, 4, 5][quality];
  const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const newInterval = q < 3 ? 1 : Math.round(intervalDays * newEF);
  if (newInterval === 1) return '1 jour';
  if (newInterval < 7) return `${newInterval} jours`;
  if (newInterval < 14) return '1 semaine';
  return `${Math.round(newInterval / 7)} semaines`;
}

function formatDateFr(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export default function FlashcardSession({ cards, nextReviewDate }: FlashcardSessionProps) {
  const router = useRouter();
  const [sessionCards, setSessionCards] = useState<SessionCard[]>(() => shuffle(cards));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<{ cardId: string; quality: 0 | 1 | 2 | 3 }[]>([]);
  const [phase, setPhase] = useState<'session' | 'finished'>(cards.length === 0 ? 'finished' : 'session');
  const [showTerminerDialog, setShowTerminerDialog] = useState(false);

  const total = sessionCards.length;
  const currentCard = sessionCards[currentIndex];

  const submitQuality = useCallback(
    (quality: 0 | 1 | 2 | 3) => {
      const card = sessionCards[currentIndex];
      setResults((prev) => [...prev, { cardId: card.id, quality }]);
      void updateFlashcard(card.id, quality);
      const nextIndex = currentIndex + 1;
      if (nextIndex >= total) {
        setPhase('finished');
      } else {
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
      }
    },
    [currentIndex, sessionCards, total],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase !== 'session') return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (!isFlipped) {
          e.preventDefault();
          setIsFlipped(true);
        }
      }
      if (isFlipped) {
        if (e.key === '1') submitQuality(0);
        if (e.key === '2') submitQuality(1);
        if (e.key === '3') submitQuality(2);
        if (e.key === '4') submitQuality(3);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFlipped, phase, submitQuality]);

  const handleTerminer = () => {
    setShowTerminerDialog(true);
  };

  const handleRestartFails = () => {
    const failedIds = new Set(results.filter((r) => r.quality === 0).map((r) => r.cardId));
    const failedCards = sessionCards.filter((c) => failedIds.has(c.id));
    setSessionCards(shuffle(failedCards));
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults([]);
    setPhase('session');
  };

  // Empty state (0 cards due)
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <CheckCircle size={64} className="text-success mx-auto" />
        <h2 className="text-2xl font-bold mt-4 text-text">Tout est à jour !</h2>
        <p className="text-muted mt-2">Aucune flashcard à réviser pour l&#39;instant.</p>
        {nextReviewDate && (
          <p className="text-sm text-muted mt-1">
            Prochaine révision le {formatDateFr(nextReviewDate)}
          </p>
        )}
        <Link
          href="/"
          className="mt-6 px-5 py-2.5 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/10 transition-colors duration-150"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  // Summary screen
  if (phase === 'finished') {
    const countByQuality = (q: number) => results.filter((r) => r.quality === q).length;
    const failCount = countByQuality(0);

    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <CheckCircle size={48} className="text-success" />
        <h2 className="text-2xl font-bold mt-4 text-text">Session terminée !</h2>

        <div className="mt-6 flex gap-6 justify-center flex-wrap">
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-text">{results.length}</span>
            <span className="text-sm text-muted">Total cartes</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-danger">{countByQuality(0)}</span>
            <span className="text-sm text-muted">À revoir</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-warning">{countByQuality(1)}</span>
            <span className="text-sm text-muted">Difficile</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-accent">{countByQuality(2)}</span>
            <span className="text-sm text-muted">Bien</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-success">{countByQuality(3)}</span>
            <span className="text-sm text-muted">Facile</span>
          </div>
        </div>

        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/10 transition-colors duration-150"
          >
            Retour au tableau de bord
          </Link>
          <button
            onClick={handleRestartFails}
            disabled={failCount === 0}
            className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-[#4F46E5] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            Recommencer les oublis ({failCount})
          </button>
        </div>
      </div>
    );
  }

  // Session screen
  const qualityButtons: { label: string; quality: 0 | 1 | 2 | 3; className: string }[] = [
    {
      label: 'À revoir',
      quality: 0,
      className: 'border-2 border-danger text-danger hover:bg-danger/10',
    },
    {
      label: 'Difficile',
      quality: 1,
      className: 'border-2 border-warning text-warning hover:bg-warning/10',
    },
    {
      label: 'Bien',
      quality: 2,
      className: 'bg-success text-white hover:opacity-90',
    },
    {
      label: 'Facile',
      quality: 3,
      className: 'border-2 border-teal text-teal hover:bg-teal/10',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <ConfirmDialog
        open={showTerminerDialog}
        title="Terminer la session ?"
        description="Votre progression sera perdue."
        confirmLabel="Terminer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => router.push('/')}
        onCancel={() => setShowTerminerDialog(false)}
      />
      {/* Sticky header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center justify-between px-4 md:px-8 py-4 gap-2">
          <span className="text-lg font-semibold text-text truncate min-w-0 flex-1">
            Flashcards — {currentCard.nodeTitle}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              {currentIndex + 1} / {total} cartes
            </span>
            <button
              onClick={handleTerminer}
              className="px-4 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/10 transition-colors duration-150 cursor-pointer"
            >
              Terminer la session
            </button>
          </div>
        </div>
        {/* Progress bar — full width, no border radius */}
        <div className="h-1 bg-border">
          <div
            className="h-1 bg-accent transition-all duration-300"
            style={{ width: `${(currentIndex / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 pb-20">
        <FlashcardCard
          question={currentCard.question}
          answer={currentCard.answer}
          securityAngle={currentCard.security_angle}
          isFlipped={isFlipped}
          nodeTitle={currentCard.nodeTitle}
          nodeColor={currentCard.nodeColor}
          onFlip={() => setIsFlipped(true)}
        />

        {/* Quality buttons */}
        {isFlipped && (
          <div className="flex gap-3 justify-center mt-6 max-w-2xl mx-auto w-full">
            {qualityButtons.map(({ label, quality, className }) => (
              <div key={quality} className="flex-1 flex flex-col items-center gap-1">
                <button
                  onClick={() => submitQuality(quality)}
                  className={`w-full rounded-lg px-2 md:px-4 py-3 font-medium text-sm cursor-pointer transition-colors duration-150 ${className}`}
                >
                  {label}
                </button>
                <span className="text-xs text-muted">
                  {previewInterval(currentCard.ease_factor, currentCard.interval_days, quality)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Keyboard hint */}
        {isFlipped && (
          <p className="text-xs text-muted text-center mt-3">
            Raccourcis : Espace pour retourner · 1/2/3/4 pour noter
          </p>
        )}
        {!isFlipped && (
          <p className="text-xs text-muted text-center mt-3">
            Appuyez sur Espace pour révéler la réponse
          </p>
        )}

        {/* Source link */}
        <div className="mt-8">
          <Link
            href={`/themes/${currentCard.themeSlug}/${currentCard.subSlug}/${currentCard.ficheSlug}`}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150"
          >
            Source : {currentCard.nodeTitle}
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
