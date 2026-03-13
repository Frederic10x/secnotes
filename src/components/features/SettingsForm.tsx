'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import type { UserPreferences, ThemeType, FontSizeType } from '@/types';
import { updateTheme, updateFontSize } from '@/actions/settings';

interface Props {
  preferences: UserPreferences;
}

const THEME_OPTIONS: { value: ThemeType; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Sombre', icon: <Moon size={16} /> },
  { value: 'light', label: 'Clair', icon: <Sun size={16} /> },
  { value: 'auto', label: 'Automatique', icon: <Monitor size={16} /> },
];

const FONT_OPTIONS: { value: FontSizeType; label: string; size: string }[] = [
  { value: 'sm', label: 'Petit', size: 'text-sm' },
  { value: 'md', label: 'Moyen', size: 'text-base' },
  { value: 'lg', label: 'Grand', size: 'text-lg' },
];

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘K', 'Ctrl+K'], label: 'Recherche globale' },
  { keys: ['Espace'], label: 'Retourner une flashcard' },
  { keys: ['1', '2', '3', '4'], label: 'Noter une flashcard' },
  { keys: ['A', 'B', 'C', 'D'], label: 'Sélectionner une réponse quiz' },
  { keys: ['Entrée'], label: 'Valider' },
];

export default function SettingsForm({ preferences }: Props) {
  const { theme, setTheme } = useTheme();

  const currentTheme = (theme as ThemeType) ?? preferences.theme;

  async function handleTheme(value: ThemeType) {
    setTheme(value);
    await updateTheme(value);
  }

  async function handleFontSize(value: FontSizeType) {
    await updateFontSize(value);
  }

  return (
    <div>
      {/* Section 1 — Apparence */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <h2 className="text-lg font-semibold text-text mb-4">Apparence</h2>

        {/* Theme */}
        <div>
          <p className="text-sm font-medium text-text mb-2">Thème</p>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map(({ value, label, icon }) => {
              const selected = currentTheme === value;
              return (
                <button
                  key={value}
                  onClick={() => handleTheme(value)}
                  className={`min-w-0 shrink border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer text-sm transition-colors duration-150 ${
                    selected
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted hover:border-muted'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font size */}
        <div className="mt-6">
          <p className="text-sm font-medium text-text mb-2">Taille du texte</p>
          <div className="flex flex-wrap gap-2">
            {FONT_OPTIONS.map(({ value, label, size }) => {
              const selected = preferences.font_size === value;
              return (
                <button
                  key={value}
                  onClick={() => handleFontSize(value)}
                  className={`min-w-0 shrink border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors duration-150 ${
                    selected
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted hover:border-muted'
                  }`}
                >
                  <span className={`font-bold ${size}`}>A</span>
                  <span className="text-sm">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2 — Raccourcis clavier */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text mb-4">Raccourcis</h2>
        <div className="flex flex-col gap-2">
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={keys.join('+')} className="flex flex-wrap justify-between items-start gap-2 py-1">
              <span className="flex-1 min-w-0 text-sm text-muted">{label}</span>
              <div className="shrink-0 flex flex-wrap gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="whitespace-nowrap bg-background border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
