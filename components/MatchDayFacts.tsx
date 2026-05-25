'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Newspaper, X, Copy, Check, Loader2 } from 'lucide-react';

interface Props {
  filter: 'month' | 'alltime';
  scopeLabel: string;
  monthStart: string | null;
  monthEnd: string | null;
}

interface Fact { id: string; text: string }

interface StatRow { name: string; date: string; goals: number; assists: number }
interface EventRow { scorer: string | null; assister: string | null; date: string }

export default function MatchDayFacts({ filter, scopeLabel, monthStart, monthEnd }: Props) {
  const [open, setOpen] = useState(false);
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // reload when scope changes
    setFacts(null);
  }, [filter, monthStart, monthEnd]);

  useEffect(() => {
    if (open && !facts && !loading) loadFacts();
  }, [open, facts, loading]);

  async function loadFacts() {
    setLoading(true);
    try {
      let statsQ = supabase
        .from('stats')
        .select('goals, assists, players(name), sessions(session_date)');
      let eventsQ = supabase
        .from('goal_events')
        .select('scorer:scorer_id(name), assister:assister_id(name), session:session_id(session_date)');

      if (filter === 'month' && monthStart && monthEnd) {
        statsQ = statsQ.gte('sessions.session_date', monthStart).lte('sessions.session_date', monthEnd);
        eventsQ = eventsQ.gte('session.session_date', monthStart).lte('session.session_date', monthEnd);
      }

      const [statsRes, eventsRes] = await Promise.all([statsQ, eventsQ]);

      const stats: StatRow[] = ((statsRes.data ?? []) as any[])
        .map((r) => ({
          name: r.players?.name,
          date: r.sessions?.session_date,
          goals: r.goals,
          assists: r.assists,
        }))
        .filter((r) => r.name && r.date);

      const events: EventRow[] = ((eventsRes.data ?? []) as any[])
        .map((r) => ({
          scorer: r.scorer?.name ?? null,
          assister: r.assister?.name ?? null,
          date: r.session?.session_date,
        }))
        .filter((r) => r.date);

      setFacts(computeFacts(stats, events));
    } finally {
      setLoading(false);
    }
  }

  async function copyFact(fact: Fact) {
    try {
      await navigator.clipboard.writeText(fact.text);
    } catch {
      const el = document.createElement('textarea');
      el.value = fact.text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(fact.id);
    setTimeout(() => setCopiedId((id) => (id === fact.id ? null : id)), 1500);
  }

  async function copyAll() {
    if (!facts) return;
    const text = [`📰 *Match Day Facts — ${scopeLabel}*`, '', ...facts.map((f) => f.text)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId('__all__');
    setTimeout(() => setCopiedId((id) => (id === '__all__' ? null : id)), 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white"
      >
        <Newspaper size={15} />
        Match Day Facts
      </button>

      {open && (
        <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm font-semibold">📰 {scopeLabel}</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition"
              aria-label="Close facts"
            >
              <X size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-zinc-600 py-8">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">Crunching numbers…</span>
            </div>
          ) : !facts || facts.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-6">No facts to surface yet.</p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {facts.map((f) => {
                  const isCopied = copiedId === f.id;
                  return (
                    <li
                      key={f.id}
                      className="bg-zinc-800/60 rounded-xl px-3 py-2 flex items-start gap-2"
                    >
                      <span className="text-zinc-200 text-xs leading-relaxed flex-1">{f.text}</span>
                      <button
                        onClick={() => copyFact(f)}
                        className={`shrink-0 rounded-md p-1.5 transition ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-zinc-500 hover:bg-zinc-700 hover:text-white'
                        }`}
                        aria-label="Copy fact"
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={copyAll}
                className={`mt-3 w-full text-xs font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                  copiedId === '__all__'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
                }`}
              >
                {copiedId === '__all__' ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === '__all__' ? 'Copied!' : 'Copy all facts'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function computeFacts(stats: StatRow[], events: EventRow[]): Fact[] {
  const facts: Fact[] = [];

  if (stats.length === 0) {
    return [{ id: 'empty', text: 'No matches logged yet for this period.' }];
  }

  const sessionDates = Array.from(new Set(stats.map((s) => s.date))).sort();
  const totalGoals = stats.reduce((s, r) => s + r.goals, 0);

  facts.push({
    id: 'totals',
    text: `⚽ ${totalGoals} goal${totalGoals === 1 ? '' : 's'} across ${sessionDates.length} session${
      sessionDates.length === 1 ? '' : 's'
    } (avg ${(totalGoals / sessionDates.length).toFixed(1)} per game)`,
  });

  const goalsByDate: Record<string, number> = {};
  for (const s of stats) goalsByDate[s.date] = (goalsByDate[s.date] ?? 0) + s.goals;
  const topSession = Object.entries(goalsByDate).sort((a, b) => b[1] - a[1])[0];
  if (topSession && topSession[1] > 0 && sessionDates.length > 1) {
    facts.push({
      id: 'top-session',
      text: `🔥 Highest scoring session: ${fmtDate(topSession[0])} (${topSession[1]} goals)`,
    });
  }

  const multiGoal = stats.filter((s) => s.goals >= 2);
  const hatTricks = stats.filter((s) => s.goals >= 3);
  if (hatTricks.length > 0) {
    const top = [...hatTricks].sort((a, b) => b.goals - a.goals)[0];
    facts.push({
      id: 'hattrick',
      text: `🎩 ${top.name} bagged ${top.goals} on ${fmtDate(top.date)}${
        hatTricks.length === 1 ? ' — the only 3+ haul' : ''
      }`,
    });
  } else if (multiGoal.length === 0) {
    facts.push({ id: 'no-multi', text: `🧱 No player has scored 2+ goals in a session this period` });
  } else {
    const braceNames = Array.from(new Set(multiGoal.map((m) => m.name)));
    if (braceNames.length === 1) {
      facts.push({ id: 'sole-brace', text: `🎯 Only ${braceNames[0]} has bagged a brace this period` });
    } else {
      facts.push({
        id: 'braces',
        text: `🎯 ${multiGoal.length} brace${multiGoal.length === 1 ? '' : 's'} from ${
          braceNames.length
        } different players`,
      });
    }
  }

  const perPlayer: Record<string, { date: string; goals: number }[]> = {};
  for (const s of stats) {
    if (!perPlayer[s.name]) perPlayer[s.name] = [];
    perPlayer[s.name].push({ date: s.date, goals: s.goals });
  }
  for (const name of Object.keys(perPlayer)) {
    perPlayer[name].sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  let bestActive: { name: string; streak: number } | null = null;
  for (const [name, list] of Object.entries(perPlayer)) {
    let cur = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].goals > 0) cur++;
      else break;
    }
    if (cur >= 2 && (!bestActive || cur > bestActive.streak)) {
      bestActive = { name, streak: cur };
    }
  }
  if (bestActive) {
    facts.push({
      id: 'active-streak',
      text: `📈 ${bestActive.name} has scored in ${bestActive.streak} consecutive sessions`,
    });
  }

  const lastDate = sessionDates[sessionDates.length - 1];
  let worstDrought: { name: string; drought: number } | null = null;
  for (const [name, list] of Object.entries(perPlayer)) {
    if (list.length < 3) continue;
    if (list[list.length - 1].date !== lastDate) continue;
    let drought = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].goals === 0) drought++;
      else break;
    }
    if (drought >= 3 && (!worstDrought || drought > worstDrought.drought)) {
      worstDrought = { name, drought };
    }
  }
  if (worstDrought) {
    facts.push({
      id: 'drought',
      text: `🌵 ${worstDrought.name} hasn't found the net in ${worstDrought.drought} sessions`,
    });
  }

  const pairs: Record<string, number> = {};
  for (const e of events) {
    if (!e.scorer || !e.assister) continue;
    const key = `${e.assister} → ${e.scorer}`;
    pairs[key] = (pairs[key] ?? 0) + 1;
  }
  const topPair = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
  if (topPair && topPair[1] >= 2) {
    facts.push({
      id: 'top-pair',
      text: `🤝 ${topPair[0]}: linked up for ${topPair[1]} goals — top duo`,
    });
  }

  const scorerEvents = events.filter((e) => e.scorer);
  if (scorerEvents.length >= 5) {
    const assisted = scorerEvents.filter((e) => e.assister).length;
    const pct = Math.round((assisted / scorerEvents.length) * 100);
    facts.push({
      id: 'assisted-pct',
      text: `🅰️ ${assisted} of ${scorerEvents.length} goals were assisted (${pct}%)`,
    });
  }

  const goalsByPlayer: Record<string, number> = {};
  for (const s of stats) goalsByPlayer[s.name] = (goalsByPlayer[s.name] ?? 0) + s.goals;
  const topScorers = Object.entries(goalsByPlayer)
    .filter(([, g]) => g > 0)
    .sort((a, b) => b[1] - a[1]);
  if (topScorers.length >= 2 && topScorers[0][1] > topScorers[1][1]) {
    const gap = topScorers[0][1] - topScorers[1][1];
    facts.push({
      id: 'top-gap',
      text: `👑 ${topScorers[0][0]} leads the scoring chart by ${gap} goal${gap === 1 ? '' : 's'}`,
    });
  }

  return facts;
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
