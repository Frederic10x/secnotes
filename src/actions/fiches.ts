'use server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markAsRead(ficheId: string, fichePath: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('fiches')
    .select('read_count')
    .eq('id', ficheId)
    .single();

  await supabaseAdmin
    .from('fiches')
    .update({
      read_at: new Date().toISOString(),
      read_count: (data?.read_count ?? 0) + 1,
    })
    .eq('id', ficheId);

  revalidatePath('/');
  revalidatePath(fichePath);
}
