'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateFlashcard(cardId: string, quality: 0 | 1 | 2 | 3): Promise<void> {
  const { data: card } = await supabaseAdmin
    .from('flashcards')
    .select('ease_factor, interval_days, fiche_id, review_count')
    .eq('id', cardId)
    .single();

  if (!card) return;

  const { ease_factor: easeFactor, interval_days: intervalDays, fiche_id: ficheId, review_count: reviewCount } = card;

  const q = [0, 2, 4, 5][quality];
  const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const newInterval = q < 3 ? 1 : Math.round(intervalDays * newEF);

  const newNextReview = new Date();
  newNextReview.setDate(newNextReview.getDate() + newInterval);

  await supabaseAdmin
    .from('flashcards')
    .update({
      ease_factor: newEF,
      interval_days: newInterval,
      next_review: newNextReview.toISOString().split('T')[0],
      review_count: (reviewCount ?? 0) + 1,
      last_quality: quality,
    })
    .eq('id', cardId);

  await supabaseAdmin.from('review_sessions').insert({
    type: 'flashcard',
    fiche_id: ficheId,
    cards_total: 1,
    cards_correct: quality >= 2 ? 1 : 0,
  });

  revalidatePath('/practice');
  revalidatePath('/');
}
