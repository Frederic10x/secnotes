import { Suspense } from "react";
import Link from "next/link";
import {
  BookOpen,
  Zap,
  Flame,
  Target,
  Layers,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return "hier";
  return `il y a ${days} jours`;
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-lg p-4 h-[88px] animate-pulse"
        />
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <div className="h-4 w-32 bg-border rounded animate-pulse" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-border rounded animate-pulse" />
      ))}
    </div>
  );
}

function DueTodaySkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <div className="h-4 w-36 bg-border rounded animate-pulse" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-9 bg-border rounded animate-pulse" />
      ))}
      <div className="h-10 bg-border rounded animate-pulse mt-4" />
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────

async function StatsBar() {
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: fichesRead },
    { count: fichesTotal },
    { count: flashcardsDue },
    { data: streakData },
    { data: avgScoreData },
  ] = await Promise.all([
    supabaseAdmin
      .from("fiches")
      .select("*", { count: "exact", head: true })
      .not("read_at", "is", null),
    supabaseAdmin.from("fiches").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .lte("next_review", today),
    supabaseAdmin.rpc("get_streak"),
    supabaseAdmin
      .from("review_sessions")
      .select("score")
      .eq("type", "quiz")
      .not("score", "is", null),
  ]);

  const streak: number = typeof streakData === "number" ? streakData : 0;
  const scores = (avgScoreData ?? []).map((r) => r.score as number);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const stats = [
    {
      icon: BookOpen,
      value: `${fichesRead ?? 0}/${fichesTotal ?? 0}`,
      label: "Fiches lues",
      color: "#6366F1",
    },
    {
      icon: Zap,
      value: flashcardsDue ?? 0,
      label: "Flashcards dues",
      color: "#F97316",
    },
    {
      icon: Flame,
      value: `${streak} jour${streak !== 1 ? "s" : ""}`,
      label: "Streak",
      color: "#F59E0B",
    },
    {
      icon: Target,
      value: avgScore !== null ? `${avgScore}%` : "—",
      label: "Score moyen",
      color: "#22C55E",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, value, label, color }) => (
        <div
          key={label}
          className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-[22px] font-bold text-text leading-none">{value}</p>
            <p className="text-xs text-muted mt-1 truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recent Activity ────────────────────────────────────────────────────────────

async function RecentActivity() {
  const { data: sessions } = await supabaseAdmin
    .from("review_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const ficheIds = (sessions ?? [])
    .map((s) => s.fiche_id)
    .filter((id): id is string => Boolean(id));

  const { data: nodesData } =
    ficheIds.length > 0
      ? await supabaseAdmin
          .from("nodes")
          .select("id, title, color")
          .in("id", ficheIds)
      : { data: [] };

  const nodeMap = new Map(
    (nodesData ?? []).map((n) => [n.id, n as { id: string; title: string; color: string }])
  );

  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text mb-4">Activité récente</h2>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <BookOpen className="w-10 h-10 text-muted opacity-40" />
          <p className="text-muted text-sm text-center">Aucune session pour l&apos;instant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold text-text mb-4">Activité récente</h2>
      <div className="flex flex-col gap-1">
        {sessions.map((session) => {
          const node = session.fiche_id ? nodeMap.get(session.fiche_id) : null;
          const isQuiz = session.type === "quiz";
          const Icon = isQuiz ? HelpCircle : Layers;
          return (
            <div
              key={session.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background transition-colors duration-150"
            >
              <div className="w-8 h-8 rounded-md bg-border flex items-center justify-center shrink-0">
                <Icon size={14} className="text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">
                  {node?.title ?? session.node_slug ?? "—"}
                </p>
                <p className="text-xs text-muted">{relativeDate(session.created_at)}</p>
              </div>
              {isQuiz && session.score !== null && (
                <span className="text-xs font-medium text-muted bg-border px-2 py-0.5 rounded-full shrink-0">
                  {session.score}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Due Today ──────────────────────────────────────────────────────────────────

async function DueToday() {
  const today = new Date().toISOString().split("T")[0];

  const { data: cards } = await supabaseAdmin
    .from("flashcards")
    .select("id, fiche_id")
    .lte("next_review", today);

  // Group by fiche_id
  const countByFiche = new Map<string, number>();
  for (const card of cards ?? []) {
    const prev = countByFiche.get(card.fiche_id) ?? 0;
    countByFiche.set(card.fiche_id, prev + 1);
  }

  const ficheIds = [...countByFiche.keys()];

  const { data: nodesData } =
    ficheIds.length > 0
      ? await supabaseAdmin
          .from("nodes")
          .select("id, title, color")
          .in("id", ficheIds)
      : { data: [] };

  type DueGroup = { ficheId: string; title: string; color: string; count: number };
  const groups: DueGroup[] = (nodesData ?? [])
    .map((n) => ({
      ficheId: n.id,
      title: (n as { id: string; title: string; color: string }).title,
      color: (n as { id: string; title: string; color: string }).color,
      count: countByFiche.get(n.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalDue = cards?.length ?? 0;

  if (groups.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text">À réviser aujourd&apos;hui</h2>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <CheckCircle className="w-10 h-10 opacity-40" style={{ color: "#22C55E" }} />
          <p className="text-sm text-center" style={{ color: "#22C55E" }}>
            Tout est à jour !
          </p>
        </div>
        <button
          disabled
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent text-white opacity-40 cursor-not-allowed"
        >
          Commencer la session
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text">À réviser aujourd&apos;hui</h2>
      <div className="flex flex-col gap-1">
        {groups.map(({ ficheId, title, color, count }) => (
          <div
            key={ficheId}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-background transition-colors duration-150"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="flex-1 min-w-0 text-sm text-text truncate">{title}</span>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ backgroundColor: "#F97316" }}
            >
              {count > 9 ? "9+" : count}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/practice"
        className="mt-1 w-full py-2.5 rounded-lg text-sm font-medium bg-accent text-white text-center hover:bg-[#4F46E5] transition-colors duration-150"
      >
        Commencer la session{totalDue > 0 ? ` (${totalDue})` : ""}
      </Link>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <Suspense fallback={<StatsSkeleton />}>
        <StatsBar />
      </Suspense>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<DueTodaySkeleton />}>
            <DueToday />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
