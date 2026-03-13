'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, BarChart2, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';
import type { QuizQuestion, Tag } from '@/types';
import { saveQuizSession } from '@/actions/quiz';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Props {
  questions: QuizQuestion[];
  ficheTitle: string;
  ficheId: string;
  breadcrumb: string;
  tags: Tag[];
  returnPath: string;
}

interface Answer {
  questionId: string;
  selected: number;
  correct: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function renderQuestionText(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="font-mono bg-surface px-2 py-0.5 rounded text-accent">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function QuizSession({
  questions,
  ficheTitle: _ficheTitle,
  ficheId,
  breadcrumb,
  tags,
  returnPath,
}: Props) {
  const router = useRouter();

  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [phase, setPhase] = useState<'question' | 'answer' | 'finished'>('question');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSkipped, setIsSkipped] = useState<boolean[]>(() =>
    new Array(questions.length).fill(false),
  );
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);

  // Refs to capture latest state in effects without stale closures
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const timeElapsedRef = useRef(timeElapsed);
  timeElapsedRef.current = timeElapsed;
  const activeQuestionsRef = useRef(activeQuestions);
  activeQuestionsRef.current = activeQuestions;

  const total = activeQuestions.length;
  const currentQuestion = activeQuestions[currentIndex];
  const isLastQuestion = currentIndex === total - 1;

  // Timer — counts up while not finished
  useEffect(() => {
    if (phase === 'finished') return;
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Save session when phase transitions to 'finished'
  useEffect(() => {
    if (phase !== 'finished') return;
    const ans = answersRef.current;
    const correct = ans.filter((a) => a.correct).length;
    void saveQuizSession(ficheId, ans.length, correct, timeElapsedRef.current, returnPath);
  }, [phase, ficheId, returnPath]);

  const handleValidate = useCallback(() => {
    if (selectedOption === null || phase !== 'question') return;
    const correct = selectedOption === currentQuestion.correct_index;
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, selected: selectedOption, correct },
    ]);
    setPhase('answer');
  }, [selectedOption, phase, currentQuestion]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setPhase('question');
  }, []);

  const handleFinish = useCallback(() => {
    setPhase('finished');
  }, []);

  const handleSkip = useCallback(() => {
    if (phase !== 'question') return;
    setIsSkipped((prev) => {
      const next = [...prev];
      next[currentIndex] = true;
      return next;
    });
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, selected: -1, correct: false },
    ]);
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setPhase('finished');
    }
  }, [phase, currentIndex, total, currentQuestion]);

  const handleAbandon = () => {
    setShowAbandonDialog(true);
  };

  const handleReset = () => {
    setActiveQuestions(questions);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setPhase('question');
    setTimeElapsed(0);
    setIsSkipped(new Array(questions.length).fill(false));
  };

  const handleRetryWrong = () => {
    const wrongIds = new Set(answers.filter((a) => !a.correct).map((a) => a.questionId));
    const wrongQuestions = activeQuestionsRef.current.filter((q) => wrongIds.has(q.id));
    setActiveQuestions(wrongQuestions);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setPhase('question');
    setTimeElapsed(0);
    setIsSkipped(new Array(wrongQuestions.length).fill(false));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase === 'finished') return;

      if (phase === 'question') {
        if (e.key === 'a' || e.key === 'A' || e.key === '1') setSelectedOption(0);
        if (e.key === 'b' || e.key === 'B' || e.key === '2') setSelectedOption(1);
        if (e.key === 'c' || e.key === 'C' || e.key === '3') setSelectedOption(2);
        if (e.key === 'd' || e.key === 'D' || e.key === '4') setSelectedOption(3);
        if (e.key === 'Enter' && selectedOption !== null) {
          handleValidate();
        }
      } else if (phase === 'answer') {
        if (e.key === 'Enter') {
          if (isLastQuestion) handleFinish();
          else handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, selectedOption, isLastQuestion, handleValidate, handleNext, handleFinish]);

  // ── Results view ─────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const correct = answers.filter((a) => a.correct).length;
    const wrong = answers.length - correct;
    const pct = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
    const avgSeconds = answers.length > 0 ? Math.round(timeElapsed / answers.length) : 0;

    const circumference = 2 * Math.PI * 54;
    const strokeOffset = (1 - pct / 100) * circumference;
    const strokeColor =
      pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

    const title =
      pct >= 80 ? 'Excellent travail !' : pct >= 50 ? 'Bon travail !' : 'À retravailler';
    const message =
      wrong > 0
        ? `Félicitations, vous avez maîtrisé l'essentiel. Il reste ${wrong} question(s) à revoir sur ce sous-thème.`
        : 'Parfait ! Vous maîtrisez complètement ce sujet.';

    return (
      <div className="max-w-2xl mx-auto pt-10 px-4 pb-16">
        {/* Score header card */}
        <div className="bg-surface border border-border rounded-2xl p-8 flex items-center gap-8">
          {/* Left: score circle */}
          <div className="shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#1E2235" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={strokeColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 60 60)"
              />
              <text
                x="60"
                y="55"
                textAnchor="middle"
                style={{ fontSize: '18px', fontWeight: 'bold', fill: 'var(--text-color)' }}
              >
                {correct}/{answers.length}
              </text>
              <text
                x="60"
                y="72"
                textAnchor="middle"
                style={{ fontSize: '12px', fill: 'var(--muted)' }}
              >
                {pct}%
              </text>
            </svg>
          </div>

          {/* Right: title + message */}
          <div>
            <h2 className="text-2xl font-bold text-text">{title}</h2>
            <p className="text-muted mt-2">{message}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 flex gap-4">
          {/* Correctes */}
          <div className="flex-1 bg-surface border border-border rounded-xl p-4 relative">
            <CheckCircle size={20} className="text-success absolute top-4 right-4" />
            <p className="text-3xl font-bold text-success">{correct}</p>
            <span className="text-xs bg-success/20 text-success rounded px-1 mt-1 inline-block">
              +{answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0}%
            </span>
            <p className="text-sm text-muted mt-1">Correctes</p>
          </div>

          {/* Incorrectes */}
          <div className="flex-1 bg-surface border border-border rounded-xl p-4 relative">
            <XCircle size={20} className="text-danger absolute top-4 right-4" />
            <p className="text-3xl font-bold text-danger">{wrong}</p>
            <span className="text-xs bg-danger/20 text-danger rounded px-1 mt-1 inline-block">
              -{answers.length > 0 ? Math.round((wrong / answers.length) * 100) : 0}%
            </span>
            <p className="text-sm text-muted mt-1">Incorrectes</p>
          </div>

          {/* Temps moyen */}
          <div className="flex-1 bg-surface border border-border rounded-xl p-4 relative">
            <Clock size={20} className="text-warning absolute top-4 right-4" />
            <p className="text-3xl font-bold text-text">
              {avgSeconds}s{' '}
              <span className="text-sm text-muted font-normal">/ question</span>
            </p>
            <p className="text-sm text-muted mt-1">Temps moyen</p>
          </div>
        </div>

        {/* Question detail list */}
        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-4">
            <BarChart2 size={20} className="text-accent" />
            Détail des réponses
          </h2>

          {answers.map((answer) => {
            const q = activeQuestionsRef.current.find((q) => q.id === answer.questionId);
            if (!q) return null;
            const isWrong = !answer.correct;

            return (
              <div
                key={answer.questionId}
                className={`border rounded-xl p-4 mb-3 flex items-start ${
                  isWrong ? 'bg-danger/5 border-danger/30' : 'bg-surface border-border'
                }`}
              >
                {answer.correct ? (
                  <CheckCircle size={20} className="text-success shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={20} className="text-danger shrink-0 mt-0.5" />
                )}

                <div className="flex-1 ml-3 min-w-0">
                  <p className={`font-medium ${isWrong ? 'text-text font-semibold' : 'text-text'}`}>
                    {q.question}
                  </p>
                  {isWrong && q.explanation && (
                    <p className="text-danger text-sm mt-1">{q.explanation}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {q.tag && (
                    <span className="text-xs uppercase font-mono bg-surface border border-border px-2 py-0.5 rounded tracking-wider text-muted">
                      {q.tag}
                    </span>
                  )}
                  {isWrong && (
                    <a href={returnPath} className="text-xs text-accent flex items-center gap-1">
                      Voir la fiche
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text text-sm font-medium hover:border-accent hover:text-accent transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw size={16} />
            Recommencer le quiz
          </button>
          <a
            href={returnPath}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-[#4F46E5] transition-colors duration-150"
          >
            <ArrowLeft size={16} />
            Retour aux fiches
          </a>
        </div>
      </div>
    );
  }

  // ── Question view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <ConfirmDialog
        open={showAbandonDialog}
        title="Abandonner le quiz ?"
        description="Votre progression sera perdue."
        confirmLabel="Abandonner"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => router.push(returnPath)}
        onCancel={() => setShowAbandonDialog(false)}
      />
      {/* Sticky header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-lg font-semibold text-text">Quiz — {breadcrumb}</h1>
            <p className="text-sm text-muted">
              Question {currentIndex + 1} / {total}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-warning" />
              <span className="font-mono text-sm text-warning">{formatTime(timeElapsed)}</span>
            </div>
            <button
              onClick={handleAbandon}
              className="px-4 py-2 rounded-lg border border-border text-muted text-sm font-medium hover:border-accent hover:text-accent transition-colors duration-150 cursor-pointer"
            >
              Abandonner
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div
            className="h-1 bg-accent transition-all duration-300"
            style={{ width: `${(currentIndex / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto w-full pt-10 px-4 pb-16">
        {/* Question label */}
        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
          QUESTION {currentIndex + 1}
        </p>

        {/* Question text */}
        <h2 className="text-2xl font-bold text-text text-center leading-snug mb-4">
          {renderQuestionText(currentQuestion.question)}
        </h2>

        {/* Tags pill */}
        <div className="flex justify-center gap-2 mb-8">
          <span className="bg-surface border border-border rounded-full px-3 py-1 text-xs text-muted">
            {breadcrumb}
            {currentQuestion.tag
              ? ` #${currentQuestion.tag}`
              : tags.map((t) => ` #${t.name}`).join('')}
          </span>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {(typeof currentQuestion.options === 'string'
            ? (JSON.parse(currentQuestion.options) as string[])
            : currentQuestion.options
          ).map((option, i) => {
            const isSelected = selectedOption === i;
            const isCorrect = i === currentQuestion.correct_index;
            const isWrong = phase === 'answer' && isSelected && !isCorrect;
            const isRight = phase === 'answer' && isCorrect;
            const isOther = phase === 'answer' && !isCorrect && !isSelected;

            let cardClass: string;
            let badgeClass: string;

            if (phase === 'question') {
              cardClass = isSelected
                ? 'bg-accent/10 border-2 border-accent rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-colors duration-150'
                : 'bg-surface border border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-surface hover:border-border transition-colors duration-150';
              badgeClass = isSelected
                ? 'w-8 h-8 rounded-lg bg-accent text-white font-mono text-sm flex items-center justify-center flex-shrink-0'
                : 'w-8 h-8 rounded-lg bg-background border border-border text-muted font-mono text-sm flex items-center justify-center flex-shrink-0';
            } else {
              if (isRight) {
                cardClass =
                  'bg-success/10 border border-success rounded-xl p-4 flex items-center gap-4';
                badgeClass =
                  'w-8 h-8 rounded-lg bg-success text-white font-mono text-sm flex items-center justify-center flex-shrink-0';
              } else if (isWrong) {
                cardClass =
                  'bg-danger/10 border border-danger rounded-xl p-4 flex items-center gap-4';
                badgeClass =
                  'w-8 h-8 rounded-lg bg-danger text-white font-mono text-sm flex items-center justify-center flex-shrink-0';
              } else {
                cardClass = isOther
                  ? 'bg-surface border border-border rounded-xl p-4 flex items-center gap-4 opacity-40'
                  : 'bg-surface border border-border rounded-xl p-4 flex items-center gap-4';
                badgeClass =
                  'w-8 h-8 rounded-lg bg-background border border-border text-muted font-mono text-sm flex items-center justify-center flex-shrink-0';
              }
            }

            return (
              <button
                key={i}
                onClick={() => phase === 'question' && setSelectedOption(i)}
                disabled={phase === 'answer'}
                className={`${cardClass} text-left w-full`}
              >
                <span className={badgeClass}>{LETTERS[i]}</span>
                <span className="text-sm text-text flex-1">{option}</span>
                {phase === 'answer' && isRight && (
                  <CheckCircle size={18} className="text-success flex-shrink-0" />
                )}
                {phase === 'answer' && isWrong && (
                  <XCircle size={18} className="text-danger flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation block */}
        {phase === 'answer' && currentQuestion.explanation && (
          <div className="bg-surface border-l-4 border-accent rounded-r-lg p-4 mt-4">
            <p className="text-xs uppercase text-muted font-semibold mb-1">Explication</p>
            <p className="text-sm text-text">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8">
          {phase === 'question' ? (
            <>
              <button
                onClick={handleValidate}
                disabled={selectedOption === null}
                className="w-full bg-accent text-white rounded-xl h-14 text-base font-medium hover:bg-[#4F46E5] transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                Valider la réponse →
              </button>
              <p
                onClick={handleSkip}
                className="text-sm text-muted hover:text-text text-center mt-3 cursor-pointer transition-colors duration-150"
              >
                Passer cette question
              </p>
            </>
          ) : (
            <button
              onClick={isLastQuestion ? handleFinish : handleNext}
              className="w-full bg-accent text-white rounded-xl h-14 text-base font-medium hover:bg-[#4F46E5] transition-colors duration-150 cursor-pointer"
            >
              {isLastQuestion ? 'Voir les résultats →' : 'Question suivante →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
