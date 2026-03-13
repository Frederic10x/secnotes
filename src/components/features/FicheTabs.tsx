"use client";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { Brain, HelpCircle, List, X } from "lucide-react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import TableOfContents from "@/components/ui/TableOfContents";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types";

interface LastQuizSession {
  score: number | null;
  cards_correct: number | null;
  cards_total: number | null;
  created_at: string;
}

interface FicheTabsProps {
  contentMd: string;
  fontSize: "sm" | "md" | "lg";
  headings: { id: string; text: string; level: 2 | 3 }[];
  flashcards: Flashcard[];
  quizCount: number;
  lastQuizSession: LastQuizSession | null;
  ficheFullPath: string;
}

function formatDateFr(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
      <Icon size={40} className="opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function FlashcardItem({ card }: { card: Flashcard }) {
  const [revealed, setRevealed] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const isDue = card.next_review <= today;
  const daysUntil = isDue
    ? 0
    : Math.ceil(
        (new Date(card.next_review).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24),
      );

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-3 relative">
      {/* Due badge top-right */}
      <div className="absolute top-3 right-3">
        {isDue ? (
          <span className="bg-warning/20 text-warning text-xs px-2 py-0.5 rounded">
            Due
          </span>
        ) : (
          <span className="bg-surface text-muted text-xs px-2 py-0.5 rounded border border-border">
            Dans {daysUntil}j
          </span>
        )}
      </div>

      {/* Question */}
      <p className="font-medium text-text pr-16">{card.question}</p>

      {/* Toggle button */}
      <button
        onClick={() => setRevealed((v) => !v)}
        className="mt-3 text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
      >
        {revealed ? "Masquer la réponse" : "Voir la réponse"}
      </button>

      {/* Answer (revealed) */}
      {revealed && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-muted">{card.answer}</p>
          {card.security_angle && (
            <p className="italic text-muted text-sm mt-1">
              {card.security_angle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function QuizSummary({
  quizCount,
  lastSession,
  ficheFullPath,
}: {
  quizCount: number;
  lastSession: LastQuizSession | null;
  ficheFullPath: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <p className="text-lg font-medium text-text mb-4">
        {quizCount} question{quizCount > 1 ? "s" : ""} disponible
        {quizCount > 1 ? "s" : ""}
      </p>
      {lastSession && lastSession.score !== null && (
        <div className="mb-4">
          <p
            className={cn(
              "font-medium",
              lastSession.score >= 80
                ? "text-success"
                : lastSession.score >= 50
                  ? "text-warning"
                  : "text-danger",
            )}
          >
            Dernier score : {lastSession.cards_correct}/
            {lastSession.cards_total} ({lastSession.score}%)
          </p>
          <p className="text-sm text-muted mt-1">
            Passé le {formatDateFr(lastSession.created_at)}
          </p>
        </div>
      )}
      <Link
        href={`${ficheFullPath}/quiz`}
        className="inline-flex items-center gap-2 bg-accent hover:bg-[#4F46E5] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        Lancer le quiz →
      </Link>
    </div>
  );
}

const tabTriggerClass =
  "px-4 py-2 text-sm text-muted data-[state=active]:text-accent data-[state=active]:font-medium transition-colors -mb-px border-b-2 border-transparent data-[state=active]:border-accent";

export default function FicheTabs({
  contentMd,
  fontSize,
  headings,
  flashcards,
  quizCount,
  lastQuizSession,
  ficheFullPath,
}: FicheTabsProps) {
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <Tabs.Root defaultValue="fiche" className="mt-4">
      <Tabs.List className="flex border-b border-border">
        <Tabs.Trigger value="fiche" className={tabTriggerClass}>
          Fiche
        </Tabs.Trigger>
        <Tabs.Trigger value="flashcards" className={tabTriggerClass}>
          Flashcards {flashcards.length}
        </Tabs.Trigger>
        <Tabs.Trigger value="quiz" className={tabTriggerClass}>
          Quiz {quizCount}
        </Tabs.Trigger>
      </Tabs.List>

      {/* FICHE TAB */}
      <Tabs.Content value="fiche">
        <div className="flex gap-12 mt-6">
          {/* Content column — max 72ch for readability */}
          <div className="flex-1 min-w-0 max-w-[72ch] w-full">
            <MarkdownRenderer content={contentMd} fontSize={fontSize} />
          </div>

          {/* TOC sidebar — takes remaining space, sticky on desktop */}
          {headings.length > 0 && (
            <div className="shrink-1 hidden lg:block">
              <div className="sticky top-8">
                <TableOfContents headings={headings} />
              </div>
            </div>
          )}
        </div>

        {/* Mobile: floating Sommaire button */}
        {headings.length > 0 && (
          <>
            <button
              onClick={() => setTocOpen(true)}
              className="fixed bottom-24 right-4 z-40 lg:hidden flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 shadow-lg text-sm text-text cursor-pointer"
            >
              <List size={16} />
              Sommaire
            </button>

            {/* Mobile TOC modal */}
            {tocOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                  onClick={() => setTocOpen(false)}
                  aria-hidden
                />
                <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface border-t border-border rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-text">Sommaire</p>
                    <button
                      onClick={() => setTocOpen(false)}
                      className="text-muted hover:text-text transition-colors cursor-pointer"
                      aria-label="Fermer"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div onClick={() => setTocOpen(false)}>
                    <TableOfContents headings={headings} />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Tabs.Content>

      {/* FLASHCARDS TAB */}
      <Tabs.Content value="flashcards">
        <div className="mt-6">
          {flashcards.length === 0 ? (
            <EmptyState
              icon={Brain}
              message="Aucune flashcard pour cette fiche"
            />
          ) : (
            <>
              {flashcards.map((card) => (
                <FlashcardItem key={card.id} card={card} />
              ))}
              <div className="mt-4">
                <Link
                  href="/practice"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-[#4F46E5] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  Commencer la révision →
                </Link>
              </div>
            </>
          )}
        </div>
      </Tabs.Content>

      {/* QUIZ TAB */}
      <Tabs.Content value="quiz">
        <div className="mt-6 max-w-xl">
          {quizCount === 0 ? (
            <EmptyState
              icon={HelpCircle}
              message="Aucune question pour cette fiche"
            />
          ) : (
            <QuizSummary
              quizCount={quizCount}
              lastSession={lastQuizSession}
              ficheFullPath={ficheFullPath}
            />
          )}
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
