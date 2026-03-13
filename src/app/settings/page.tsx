import { supabaseAdmin } from '@/lib/supabase/server';
import type { UserPreferences } from '@/types';
import SettingsForm from '@/components/features/SettingsForm';

export default async function SettingsPage() {
  const { data } = await supabaseAdmin
    .from('user_preferences')
    .select('*')
    .eq('id', 1)
    .single();

  const preferences = (data ?? { id: 1, theme: 'dark', font_size: 'md' }) as UserPreferences;

  return (
    <div className="max-w-lg mx-auto pt-10 px-4 pb-16">
      <h1 className="text-2xl font-bold text-text mb-8">Paramètres</h1>
      <SettingsForm preferences={preferences} />
    </div>
  );
}
