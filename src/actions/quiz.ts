'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveQuizSession(
  ficheId: string,
  cardsTotal: number,
  cardsCorrect: number,
  durationSec: number,
  returnPath: string,
): Promise<void> {
  const score = Math.round((cardsCorrect / cardsTotal) * 100);

  await supabaseAdmin.from('review_sessions').insert({
    type: 'quiz',
    fiche_id: ficheId,
    score,
    cards_total: cardsTotal,
    cards_correct: cardsCorrect,
    duration_sec: durationSec,
  });

  revalidatePath('/');
  revalidatePath(returnPath);
}
