-- ============================================================
-- SecNotes — Schema Supabase complet + Policies RLS
-- ============================================================


-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- Fix : wrapper immutable pour unaccent (résout l'erreur 42P17)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $
  SELECT unaccent($1)
$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;


-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE node_type AS ENUM ('folder', 'fiche');
CREATE TYPE session_type AS ENUM ('flashcard', 'quiz');
CREATE TYPE font_size_type AS ENUM ('sm', 'md', 'lg');
CREATE TYPE theme_type AS ENUM ('dark', 'light', 'auto');


-- ============================================================
-- NODES — arborescence folders + fiches
-- ============================================================
CREATE TABLE nodes (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id    uuid REFERENCES nodes(id) ON DELETE CASCADE,
  type         node_type NOT NULL,
  slug         text NOT NULL,
  title        text NOT NULL,
  icon         text,
  color        text DEFAULT '#6366F1',
  order_index  int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('french', immutable_unaccent(title))) STORED,
  UNIQUE (parent_id, slug)
);


CREATE INDEX idx_nodes_parent  ON nodes(parent_id);
CREATE INDEX idx_nodes_type    ON nodes(type);
CREATE INDEX idx_nodes_slug    ON nodes(slug);
CREATE INDEX idx_nodes_fts     ON nodes USING GIN(search_vector);


-- ============================================================
-- FICHES — contenu markdown
-- ============================================================
CREATE TABLE fiches (
  id           uuid PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  content_md   text NOT NULL DEFAULT '',
  read_at      timestamptz,
  read_count   int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('french', immutable_unaccent(content_md))) STORED
);


CREATE INDEX idx_fiches_fts    ON fiches USING GIN(search_vector);
CREATE INDEX idx_fiches_read   ON fiches(read_at);


-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE tags (
  id    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#6366F1'
);


CREATE TABLE fiche_tags (
  fiche_id uuid REFERENCES fiches(id) ON DELETE CASCADE,
  tag_id   uuid REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (fiche_id, tag_id)
);


CREATE INDEX idx_fiche_tags_fiche ON fiche_tags(fiche_id);
CREATE INDEX idx_fiche_tags_tag   ON fiche_tags(tag_id);


-- ============================================================
-- FLASHCARDS — algorithme SM-2
-- ============================================================
CREATE TABLE flashcards (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiche_id       uuid NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  question       text NOT NULL,
  answer         text NOT NULL,
  security_angle text,
  ease_factor    float DEFAULT 2.5,
  interval_days  int DEFAULT 1,
  next_review    date DEFAULT CURRENT_DATE,
  review_count   int DEFAULT 0,
  last_quality   int,
  created_at     timestamptz DEFAULT now(),
  search_vector  tsvector
    GENERATED ALWAYS AS (to_tsvector('french', immutable_unaccent(question))) STORED
);


CREATE INDEX idx_flashcards_fiche  ON flashcards(fiche_id);
CREATE INDEX idx_flashcards_review ON flashcards(next_review);
CREATE INDEX idx_flashcards_fts    ON flashcards USING GIN(search_vector);


-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE quiz_questions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiche_id      uuid NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  question      text NOT NULL,
  options       jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation   text,
  tag           text,
  created_at    timestamptz DEFAULT now()
);


CREATE INDEX idx_quiz_fiche ON quiz_questions(fiche_id);


-- ============================================================
-- REVIEW SESSIONS — tracking progression dashboard
-- ============================================================
CREATE TABLE review_sessions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type           session_type NOT NULL,
  fiche_id       uuid REFERENCES fiches(id) ON DELETE SET NULL,
  node_slug      text,
  score          int,
  cards_total    int,
  cards_correct  int,
  duration_sec   int,
  created_at     timestamptz DEFAULT now()
);


CREATE INDEX idx_sessions_created ON review_sessions(created_at DESC);
CREATE INDEX idx_sessions_fiche   ON review_sessions(fiche_id);
CREATE INDEX idx_sessions_type    ON review_sessions(type);


-- ============================================================
-- USER PREFERENCES — 1 seule ligne possible
-- ============================================================
CREATE TABLE user_preferences (
  id        int PRIMARY KEY DEFAULT 1,
  theme     theme_type DEFAULT 'dark',
  font_size font_size_type DEFAULT 'md',
  CHECK (id = 1)
);


INSERT INTO user_preferences DEFAULT VALUES;


-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================


-- Progression récursive d'un node (% fiches lues)
CREATE OR REPLACE FUNCTION get_node_progress(node_id uuid)
RETURNS TABLE(total_fiches int, read_fiches int, progress_pct int) AS $
WITH RECURSIVE subtree AS (
  SELECT id FROM nodes WHERE id = node_id
  UNION ALL
  SELECT n.id FROM nodes n JOIN subtree s ON n.parent_id = s.id
)
SELECT
  COUNT(f.id)::int,
  COUNT(CASE WHEN f.read_at IS NOT NULL THEN 1 END)::int,
  CASE
    WHEN COUNT(f.id) = 0 THEN 0
    ELSE (COUNT(CASE WHEN f.read_at IS NOT NULL THEN 1 END) * 100 / COUNT(f.id))::int
  END
FROM subtree s
JOIN nodes n ON n.id = s.id AND n.type = 'fiche'
LEFT JOIN fiches f ON f.id = n.id;
$ LANGUAGE sql STABLE;


-- Streak (jours consécutifs avec au moins une session)
CREATE OR REPLACE FUNCTION get_streak()
RETURNS int AS $
DECLARE
  streak     int := 0;
  check_date date := CURRENT_DATE;
BEGIN
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM review_sessions
      WHERE created_at::date = check_date
    );
    streak     := streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;
  RETURN streak;
END;
$ LANGUAGE plpgsql STABLE;


-- Recherche globale full-text (fiches + dossiers + flashcards + tags)
CREATE OR REPLACE FUNCTION global_search(query text)
RETURNS TABLE(
  id         uuid,
  type       text,
  title      text,
  breadcrumb text,
  tags       text[],
  score      float
) AS $
SELECT
  r_id,
  r_type,
  r_title,
  r_breadcrumb,
  r_tags,
  r_score
FROM (


  SELECT
    n.id                AS r_id,
    'fiche'::text       AS r_type,
    n.title             AS r_title,
    n.slug              AS r_breadcrumb,
    ARRAY(
      SELECT t.name FROM tags t
      JOIN fiche_tags ft ON ft.tag_id = t.id
      WHERE ft.fiche_id = f.id
    )                   AS r_tags,
    ts_rank(f.search_vector, plainto_tsquery('french', immutable_unaccent(query)))::float AS r_score
  FROM fiches f
  JOIN nodes n ON n.id = f.id
  WHERE f.search_vector @@ plainto_tsquery('french', immutable_unaccent(query))


  UNION ALL


  SELECT
    n.id                AS r_id,
    'folder'::text      AS r_type,
    n.title             AS r_title,
    n.slug              AS r_breadcrumb,
    '{}'::text[]        AS r_tags,
    ts_rank(n.search_vector, plainto_tsquery('french', immutable_unaccent(query)))::float AS r_score
  FROM nodes n
  WHERE n.type = 'folder'
    AND n.search_vector @@ plainto_tsquery('french', immutable_unaccent(query))


  UNION ALL


  SELECT
    fc.id               AS r_id,
    'flashcard'::text   AS r_type,
    fc.question         AS r_title,
    n.slug              AS r_breadcrumb,
    '{}'::text[]        AS r_tags,
    ts_rank(fc.search_vector, plainto_tsquery('french', immutable_unaccent(query)))::float AS r_score
  FROM flashcards fc
  JOIN fiches f ON f.id = fc.fiche_id
  JOIN nodes n ON n.id = f.id
  WHERE fc.search_vector @@ plainto_tsquery('french', immutable_unaccent(query))


) AS results
ORDER BY r_score DESC
LIMIT 10;
$ LANGUAGE sql STABLE;




-- ============================================================
-- ROW LEVEL SECURITY — activation
-- ============================================================
ALTER TABLE nodes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiche_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- POLICIES — accès total anon (app solo, pas d'auth)
-- ============================================================


-- NODES
CREATE POLICY "nodes_select" ON nodes FOR SELECT TO anon USING (true);
CREATE POLICY "nodes_insert" ON nodes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "nodes_update" ON nodes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "nodes_delete" ON nodes FOR DELETE TO anon USING (true);


-- FICHES
CREATE POLICY "fiches_select" ON fiches FOR SELECT TO anon USING (true);
CREATE POLICY "fiches_insert" ON fiches FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "fiches_update" ON fiches FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "fiches_delete" ON fiches FOR DELETE TO anon USING (true);


-- TAGS
CREATE POLICY "tags_select" ON tags FOR SELECT TO anon USING (true);
CREATE POLICY "tags_insert" ON tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "tags_update" ON tags FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tags_delete" ON tags FOR DELETE TO anon USING (true);


-- FICHE_TAGS
CREATE POLICY "fiche_tags_select" ON fiche_tags FOR SELECT TO anon USING (true);
CREATE POLICY "fiche_tags_insert" ON fiche_tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "fiche_tags_delete" ON fiche_tags FOR DELETE TO anon USING (true);


-- FLASHCARDS
CREATE POLICY "flashcards_select" ON flashcards FOR SELECT TO anon USING (true);
CREATE POLICY "flashcards_insert" ON flashcards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "flashcards_update" ON flashcards FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "flashcards_delete" ON flashcards FOR DELETE TO anon USING (true);


-- QUIZ_QUESTIONS
CREATE POLICY "quiz_select" ON quiz_questions FOR SELECT TO anon USING (true);
CREATE POLICY "quiz_insert" ON quiz_questions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "quiz_update" ON quiz_questions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "quiz_delete" ON quiz_questions FOR DELETE TO anon USING (true);


-- REVIEW_SESSIONS
CREATE POLICY "sessions_select" ON review_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "sessions_insert" ON review_sessions FOR INSERT TO anon WITH CHECK (true);


-- USER_PREFERENCES
CREATE POLICY "prefs_select" ON user_preferences FOR SELECT TO anon USING (true);
CREATE POLICY "prefs_update" ON user_preferences
  FOR UPDATE TO anon USING (id = 1) WITH CHECK (id = 1);
