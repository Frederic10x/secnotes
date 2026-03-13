'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function updateTheme(theme: 'dark' | 'light' | 'auto') {
  await supabaseAdmin
    .from('user_preferences')
    .update({ theme })
    .eq('id', 1);
  revalidatePath('/settings');
}

export async function updateFontSize(fontSize: 'sm' | 'md' | 'lg') {
  await supabaseAdmin
    .from('user_preferences')
    .update({ font_size: fontSize })
    .eq('id', 1);
  revalidatePath('/settings');
}
