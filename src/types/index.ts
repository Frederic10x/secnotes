// =============================================================
// SecNotes — Shared TypeScript types
// Column names match exactly /supabase/schema.sql
// =============================================================

// ---- Enum mirrors -----------------------------------------------

export type NodeType = "folder" | "fiche";
export type SessionType = "flashcard" | "quiz";
export type FontSizeType = "sm" | "md" | "lg";
export type ThemeType = "dark" | "light" | "auto";

// ---- nodes -------------------------------------------------------

export interface Node {
  id: string;
  parent_id: string | null;
  type: NodeType;
  slug: string;
  title: string;
  icon: string | null;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/** Recursive tree node — used in sidebar and folder views */
export interface NodeWithChildren extends Node {
  children: NodeWithChildren[];
}

// ---- fiches ------------------------------------------------------
// Note: fiches.id is also a FK to nodes.id (shared PK)

export interface Fiche {
  id: string;
  content_md: string;
  read_at: string | null;
  read_count: number;
  created_at: string;
  updated_at: string;
}

// ---- tags --------------------------------------------------------

export interface Tag {
  id: string;
  name: string;
  color: string;
}

// ---- fiche_tags --------------------------------------------------

export interface FicheTag {
  fiche_id: string;
  tag_id: string;
}

// ---- flashcards --------------------------------------------------

export interface Flashcard {
  id: string;
  fiche_id: string;
  question: string;
  answer: string;
  security_angle: string | null;
  ease_factor: number;
  interval_days: number;
  next_review: string;
  review_count: number;
  last_quality: number | null;
  created_at: string;
}

// ---- quiz_questions ----------------------------------------------
// options is stored as jsonb — expected shape: string[]

export interface QuizQuestion {
  id: string;
  fiche_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  tag: string | null;
  created_at: string;
}

// ---- review_sessions ---------------------------------------------

export interface ReviewSession {
  id: string;
  type: SessionType;
  fiche_id: string | null;
  node_slug: string | null;
  score: number | null;
  cards_total: number | null;
  cards_correct: number | null;
  duration_sec: number | null;
  created_at: string;
}

// ---- user_preferences --------------------------------------------
// id is always 1 (single-row table enforced by CHECK constraint)

export interface UserPreferences {
  id: 1;
  theme: ThemeType;
  font_size: FontSizeType;
}
