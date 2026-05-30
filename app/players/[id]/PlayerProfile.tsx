'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Trophy, Users, Shield, ShieldCheck, Hand } from 'lucide-react';
import FormGuide from '@/components/FormGuide';

interface StatRow { goals: number; assists: number; conceded: number; session_date: string }

export default function PlayerProfile({ playerId }: { playerId: string }) {
  const [scope, setScope] = useState<'month' | 'alltime'>('alltime');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [isKeeper, setIsKeeper] = useState(false);
  const [allStats, setAllStats] = useState<StatRow[]>([]);
  const [totalSessionsAll, setTotalSessionsAll] = useState(0);
  const [totalSessionsMonth, setTotalSessionsMonth] = useState(0);
  const [partner, setPartner] = useState<{ name: string; count: number } | null>(null);

  useEffect(() => { fetchAll(); }, [playerId]);

  async function fetchAll() {
    setLoading(true);

    const { data: playerRow } = await supabase
      .from('players')
      .select('name, is_goalkeeper')
      .eq('id', playerId)
      .maybeSingle();

    if (!playerRow) {
      setName('');
      setLoading(false);
      return;
    }
    setName(playerRow.name as string);
    setIsKeeper(Boolean((playerRow as any).is_goalkeeper));

    const { data: statsRows } = await supabase
      .from('stats')
      .select('goals, assists, goals_conceded, sessions(session_date)')
      .eq('player_id', playerId);

    const stats: StatRow[] = ((statsRows ?? []) as any[])
      .map((r) => ({ goals: r.goals, assists: r.assists, conceded: r.goals_conceded ?? 0, session_date: r.sessions?.session_date }))
      .filter((r) => r.session_date)
      .sort((a, b) => (a.session_date < b.session_date ? 1 : -1));
    setAllStats(stats);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { count: countAll } = await supabase
      .from('sessions').select('id', { count: 'exact', head: true });
    setTotalSessionsAll(countAll ?? 0);

    const { count: countMonth } = await supabase
      .from('sessions').select('id', { count: 'exact', head: true })
      .gte('session_date', monthStart).lte('session_date', monthEnd);
    setTotalSessionsMonth(countMonth ?? 0);

    const { data: events } = await supabase
      .from('goal_events')
      .select('scorer:scorer_id(id, name), assister:assister_id(id, name)')
      .or(`scorer_id.eq.${playerId},assister_id.eq.${playerId}`);

    const pairCounts: Record<string, number> = {};
    for (const e of (events ?? []) as any[]) {
      const scorerId = e.scorer?.id;
      const assisterId = e.assister?.id;
      if (!scorerId || !assisterId) continue;
      if (scorerId !== playerId && assisterId !== playerId) continue;
      const other = scorerId === playerId ? e.assister?.name : e.scorer?.name;
      if (!other) continue;
      pairCounts[other] = (pairCounts[other] ?? 0) + 1;
    }
    const partnerEntries = Object.entries(pairCounts).sort((a, b) => b[1] - a[1]);
    setPartner(partnerEntries.length > 0 ? { name: partnerEntries[0][0], count: partnerEntries[0][1] } : null);

    setLoading(false);
  }

  const monthBounds = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  }, []);

  const scopedStats = scope === 'month'
    ? allStats.filter((s) => s.session_date >= monthBounds.start && s.session_date <= monthBounds.end)
    : allStats;

  const totalGoals = scopedStats.reduce((s, r) => s + r.goals, 0);
  const totalAssists = scopedStats.reduce((s, r) => s + r.assists, 0);
  const games = scopedStats.length;
  const denom = scope === 'month' ? totalSessionsMonth : totalSessionsAll;
  const attendance = denom > 0 ? Math.round((games / denom) * 100) : 0;

  const bestMonth = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const s of allStats) {
      const key = s.session_date.slice(0, 7);
      byMonth[key] = (byMonth[key] ?? 0) + s.goals + s.assists;
    }
    const entries = Object.entries(byMonth).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 && entries[0][1] > 0 ? { key: entries[0][0], pts: entries[0][1] } : null;
  }, [allStats]);

  const longestStreak = useMemo(() => {
    const asc = [...scopedStats].reverse();
    let best = 0;
    let cur = 0;
    for (const s of asc) {
      if (s.goals > 0) { cur += 1; if (cur > best) best = cur; }
      else { cur = 0; }
    }
    return best;
  }, [scopedStats]);

  const formEntries = allStats.slice(0, 5).map((s) => ({ pts: s.goals + s.assists }));

  // ── Keeper-specific derivations ──────────────────────────────────────────
  const totalConceded = scopedStats.reduce((s, r) => s + r.conceded, 0);
  const cleanSheets = scopedStats.filter((s) => s.conceded === 0).length;
  const concededPerGame = games > 0 ? (totalConceded / games).toFixed(1) : '0';

  const cleanSheetStreak = useMemo(() => {
    const asc = [...scopedStats].reverse();
    let best = 0;
    let cur = 0;
    for (const s of asc) {
      if (s.conceded === 0) { cur += 1; if (cur > best) best = cur; }
      else { cur = 0; }
    }
    return best;
  }, [scopedStats]);

  // Lowest-conceding month is the keeper equivalent of "best month".
  const tightestMonth = useMemo(() => {
    const byMonth: Record<string, { conceded: number; games: number }> = {};
    for (const s of allStats) {
      const key = s.session_date.slice(0, 7);
      const m = (byMonth[key] ||= { conceded: 0, games: 0 });
      m.conceded += s.conceded;
      m.games += 1;
    }
    const entries = Object.entries(byMonth)
      .sort((a, b) => a[1].conceded / a[1].games - b[1].conceded / b[1].games);
    return entries.length > 0 ? { key: entries[0][0], conceded: entries[0][1].conceded } : null;
  }, [allStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-zinc-600 py-16">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  if (!name) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">Player not found.</p>
        <Link href="/leaderboard" className="text-rose-400 text-sm mt-3 inline-block">← Back to leaderboard</Link>
      </div>
    );
  }

  const scopeToggle = (
    <div className="flex gap-2">
      {(['month', 'alltime'] as const).map((f) => (
        <button
          key={f}
          onClick={() => setScope(f)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
            scope === f
              ? 'bg-rose-500 text-white'
              : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
          }`}
        >
          {f === 'month' ? 'This Month' : 'All Time'}
        </button>
      ))}
    </div>
  );

  if (isKeeper) {
    const careerConceded = allStats.reduce((s, r) => s + r.conceded, 0);
    return (
      <div className="flex flex-col gap-5">
        <Link href="/leaderboard" className="flex items-center gap-1.5 text-zinc-500 hover:text-rose-400 text-xs transition w-fit">
          <ArrowLeft size={13} />
          Leaderboard
        </Link>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-2xl">{name}</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
              <Hand size={11} /> Keeper
            </span>
          </div>
          <p className="text-zinc-500 text-xs mt-0.5">
            {allStats.length} game{allStats.length === 1 ? '' : 's'} · {careerConceded} career conceded
          </p>
        </div>

        {scopeToggle}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Conceded" value={totalConceded} accent />
          <Stat label="Clean Sheets" value={cleanSheets} />
          <Stat label="Per Game" value={concededPerGame} />
          <Stat label="Games" value={games} />
          <Stat label="Attendance" value={`${attendance}%`} />
          <Stat label="Best CS Run" value={cleanSheetStreak} />
        </div>

        {scopedStats.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Recent Form</span>
            <KeeperForm entries={scopedStats.slice(0, 5).map((s) => s.conceded)} />
          </div>
        )}

        {cleanSheets > 0 && (
          <Highlight icon={<ShieldCheck size={15} className="text-emerald-400" />} label="Clean Sheets">
            {cleanSheets} shutout{cleanSheets === 1 ? '' : 's'}
            {games > 0 && <span className="text-zinc-500"> · {Math.round((cleanSheets / games) * 100)}% of games</span>}
          </Highlight>
        )}

        {tightestMonth && (
          <Highlight icon={<Shield size={15} className="text-rose-400" />} label="Tightest Month">
            {fmtMonth(tightestMonth.key)} · {tightestMonth.conceded} conceded
          </Highlight>
        )}
      </div>
    );
  }

  const careerPts = allStats.reduce((s, r) => s + r.goals + r.assists, 0);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/leaderboard" className="flex items-center gap-1.5 text-zinc-500 hover:text-rose-400 text-xs transition w-fit">
        <ArrowLeft size={13} />
        Leaderboard
      </Link>

      <div>
        <h2 className="text-white font-bold text-2xl">{name}</h2>
        <p className="text-zinc-500 text-xs mt-0.5">
          {allStats.length} game{allStats.length === 1 ? '' : 's'} played · {careerPts} career pts
        </p>
      </div>

      {scopeToggle}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Goals" value={totalGoals} accent />
        <Stat label="Assists" value={totalAssists} />
        <Stat label="Points" value={totalGoals + totalAssists} />
        <Stat label="Games" value={games} />
        <Stat label="Attendance" value={`${attendance}%`} />
        <Stat label={longestStreak === 1 ? 'Streak (1 game)' : `Streak (${longestStreak} games)`} value={longestStreak} />
      </div>

      {formEntries.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Recent Form</span>
          <FormGuide entries={formEntries} />
        </div>
      )}

      {bestMonth && (
        <Highlight icon={<Trophy size={15} className="text-rose-400" />} label="Best Month">
          {fmtMonth(bestMonth.key)} · {bestMonth.pts} pts
        </Highlight>
      )}

      {partner && (
        <Highlight icon={<Users size={15} className="text-rose-400" />} label="Best Chemistry">
          {partner.name} · {partner.count} goal{partner.count === 1 ? '' : 's'} together
        </Highlight>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-3 flex flex-col items-center gap-0.5">
      <span className={`text-2xl font-bold ${accent ? 'text-rose-400' : 'text-white'}`}>{value}</span>
      <span className="text-zinc-500 text-[10px] font-medium uppercase tracking-wide text-center">{label}</span>
    </div>
  );
}

function Highlight({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-2xl px-4 py-3 flex items-center gap-3">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-white text-sm font-semibold">{children}</p>
      </div>
    </div>
  );
}

// Keeper form chips: newest first. 0 conceded = green clean sheet, otherwise
// the conceded count on a rose chip that deepens as it leaks more goals.
function KeeperForm({ entries }: { entries: number[] }) {
  const slots = [...entries];
  while (slots.length < 5) slots.push(-1); // -1 = didn't play

  return (
    <div className="flex items-center gap-1">
      {slots.slice(0, 5).map((c, i) => {
        if (c < 0) {
          return (
            <span
              key={i}
              className="w-5 h-5 rounded-md border border-dashed border-zinc-700 bg-transparent"
              title="Didn't play"
            />
          );
        }
        const cls =
          c === 0
            ? 'bg-emerald-500/70 text-white border-emerald-400'
            : c === 1
            ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
            : c <= 3
            ? 'bg-rose-500/45 text-rose-50 border-rose-500/60'
            : 'bg-rose-500/80 text-white border-rose-400';
        return (
          <span
            key={i}
            className={`w-5 h-5 rounded-md border text-[10px] font-bold flex items-center justify-center ${cls}`}
            title={c === 0 ? 'Clean sheet' : `${c} conceded`}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
}

function fmtMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
