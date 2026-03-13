import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface NodeDef {
  slug: string;
  title: string;
  icon: string;
  color: string;
  parentSlug?: string;
}

const NODE_TREE: NodeDef[] = [
  { slug: 'windows',       title: 'Windows',       icon: 'Monitor',  color: '#3B82F6' },
  { slug: 'fundamentals',  title: 'Fundamentals',  icon: 'BookOpen', color: '#3B82F6', parentSlug: 'windows' },
  { slug: 'linux',         title: 'Linux',         icon: 'Terminal', color: '#F97316' },
  { slug: 'permissions',   title: 'Permissions',   icon: 'Shield',   color: '#F97316', parentSlug: 'linux' },
  { slug: 'processus',     title: 'Processus',     icon: 'Cpu',      color: '#F97316', parentSlug: 'linux' },
  { slug: 'reseaux',       title: 'Réseaux',       icon: 'Network',  color: '#14B8A6' },
  { slug: 'modele-osi',    title: 'Modèle OSI',    icon: 'Layers',   color: '#14B8A6', parentSlug: 'reseaux' },
];

async function upsertNode(def: NodeDef, parentId: string | null): Promise<string> {
  // Look up existing node
  const query = supabaseAdmin
    .from('nodes')
    .select('id')
    .eq('slug', def.slug)
    .eq('type', 'folder');

  const { data: existing } = parentId
    ? await query.eq('parent_id', parentId)
    : await query.is('parent_id', null);

  if (existing && existing.length > 0) {
    return existing[0].id as string;
  }

  const { data, error } = await supabaseAdmin
    .from('nodes')
    .insert({
      parent_id: parentId,
      type: 'folder',
      slug: def.slug,
      title: def.title,
      icon: def.icon,
      color: def.color,
      order_index: 0,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to insert node "${def.slug}": ${error.message}`);
  return data.id as string;
}

async function main() {
  const idMap: Record<string, string> = {};

  for (const def of NODE_TREE) {
    const parentId = def.parentSlug ? idMap[def.parentSlug] : null;
    const id = await upsertNode(def, parentId ?? null);
    idMap[def.slug] = id;
  }

  console.log('✅ Nodes seedés : 7 dossiers insérés/mis à jour');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
