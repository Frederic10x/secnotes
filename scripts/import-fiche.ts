import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Arg parsing ──────────────────────────────────────────────────────────────

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && args[i + 1] !== undefined) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return result;
}

const REQUIRED_ARGS = ['theme', 'subtheme', 'fiche', 'flashcards', 'quiz'];

function validateArgs(args: Record<string, string>): void {
  const missing = REQUIRED_ARGS.filter((k) => !args[k]);
  if (missing.length > 0) {
    console.error(`❌ Missing required arguments: ${missing.map((k) => `--${k}`).join(', ')}`);
    console.error(
      'Usage: npm run import-fiche -- --theme <theme> --subtheme <subtheme> --fiche <path> --flashcards <path> --quiz <path>',
    );
    process.exit(1);
  }
}

// ── Node helpers ─────────────────────────────────────────────────────────────

async function resolveOrCreateFolder(
  slug: string,
  title: string,
  color: string,
  parentId: string | null,
): Promise<string> {
  const query = supabaseAdmin
    .from('nodes')
    .select('id, color')
    .eq('slug', slug)
    .eq('type', 'folder');

  const { data: existing } = parentId
    ? await query.eq('parent_id', parentId)
    : await query.is('parent_id', null);

  if (existing && existing.length > 0) {
    return existing[0].id as string;
  }

  const { data, error } = await supabaseAdmin
    .from('nodes')
    .insert({ parent_id: parentId, type: 'folder', slug, title, color, order_index: 0 })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create folder "${slug}": ${error.message}`);
  return data.id as string;
}

async function getFolderColor(id: string): Promise<string> {
  const { data } = await supabaseAdmin.from('nodes').select('color').eq('id', id).single();
  return (data?.color as string) ?? '#6366F1';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  validateArgs(args);

  const { theme, subtheme, fiche: fichePath, flashcards: flashcardsPath, quiz: quizPath } = args;

  // Read input files
  const contentMd = fs.readFileSync(fichePath, 'utf-8');
  const flashcardsRaw = JSON.parse(fs.readFileSync(flashcardsPath, 'utf-8')) as Array<{
    question: string;
    answer: string;
    security_angle?: string;
  }>;
  const quizRaw = JSON.parse(fs.readFileSync(quizPath, 'utf-8')) as Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
    tag?: string;
  }>;

  // Validate flashcards
  for (const card of flashcardsRaw) {
    if (!card.question || !card.answer) {
      throw new Error('Invalid flashcard: missing question or answer');
    }
  }

  // Validate quiz questions
  for (const q of quizRaw) {
    if (q.correct_index >= q.options.length) {
      throw new Error(
        `Invalid quiz question: correct_index ${q.correct_index} out of bounds (options length: ${q.options.length})`,
      );
    }
  }

  // ── Step 1: Resolve or create parent nodes ──────────────────────────────

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const themeId = await resolveOrCreateFolder(theme, capitalize(theme), '#6366F1', null);
  const themeColor = await getFolderColor(themeId);
  const subthemeId = await resolveOrCreateFolder(
    subtheme,
    capitalize(subtheme),
    themeColor,
    themeId,
  );

  // ── Step 2: Create fiche node + content ─────────────────────────────────

  const ficheSlug = `${subtheme}-${Date.now()}`;

  // Infer title from first H1
  const h1Match = contentMd.match(/^#\s+(.+)$/m);
  const ficheTitle = h1Match ? h1Match[1].trim() : ficheSlug;

  const { data: ficheNode, error: nodeError } = await supabaseAdmin
    .from('nodes')
    .insert({
      parent_id: subthemeId,
      type: 'fiche',
      slug: ficheSlug,
      title: ficheTitle,
      color: themeColor,
      order_index: 0,
    })
    .select('id')
    .single();

  if (nodeError) throw new Error(`Failed to create fiche node: ${nodeError.message}`);

  const ficheId = ficheNode.id as string;

  const { error: ficheError } = await supabaseAdmin
    .from('fiches')
    .upsert({ id: ficheId, content_md: contentMd, updated_at: new Date().toISOString() });

  if (ficheError) throw new Error(`Failed to insert fiche content: ${ficheError.message}`);

  // ── Step 3: Write to Obsidian ────────────────────────────────────────────

  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (vaultPath) {
    const targetDir = path.join(vaultPath, theme, subtheme);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, `${ficheSlug}.md`), contentMd, 'utf-8');
  } else {
    console.warn('⚠️  OBSIDIAN_VAULT_PATH not set — skipping Obsidian sync');
  }

  // ── Step 4: Flashcards (idempotent) ─────────────────────────────────────

  await supabaseAdmin.from('flashcards').delete().eq('fiche_id', ficheId);

  const today = new Date().toISOString().split('T')[0];
  const { error: fcError } = await supabaseAdmin.from('flashcards').insert(
    flashcardsRaw.map((card) => ({
      fiche_id: ficheId,
      question: card.question,
      answer: card.answer,
      security_angle: card.security_angle ?? null,
      ease_factor: 2.5,
      interval_days: 1,
      next_review: today,
    })),
  );

  if (fcError) throw new Error(`Failed to insert flashcards: ${fcError.message}`);

  // ── Step 5: Quiz questions (idempotent) ──────────────────────────────────

  await supabaseAdmin.from('quiz_questions').delete().eq('fiche_id', ficheId);

  const { error: quizError } = await supabaseAdmin.from('quiz_questions').insert(
    quizRaw.map((q) => ({
      fiche_id: ficheId,
      question: q.question,
      options: JSON.stringify(q.options),
      correct_index: q.correct_index,
      explanation: q.explanation ?? null,
      tag: q.tag ?? null,
    })),
  );

  if (quizError) throw new Error(`Failed to insert quiz questions: ${quizError.message}`);

  // ── Step 6: Cleanup + output ─────────────────────────────────────────────

  fs.unlinkSync(fichePath);
  fs.unlinkSync(flashcardsPath);
  fs.unlinkSync(quizPath);

  console.log(
    `✅ ${theme}/${subtheme} — ${flashcardsRaw.length} flashcards, ${quizRaw.length} questions`,
  );
}

main().catch((err) => {
  console.error('❌ Import failed:', err.message);
  process.exit(1);
});
