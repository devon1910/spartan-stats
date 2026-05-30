'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Hand, ShieldCheck, Share2 } from 'lucide-react';

interface Props {
  scopeLabel: string;
  // when null, all-time
  monthStart: string | null;
  monthEnd: string | null;
}

interface KeeperAgg {
  id: string;
  name: string;
  conceded: number;
  games: number;
  cleanSheets: number;
}

export default function GoalkeepersCard({ scopeLabel, monthStart, monthEnd }: Props) {
  const [keepers, setKeepers] = useState<KeeperAgg[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchKeepers();
  }, [monthStart, monthEnd]);

  async function fetchKeepers() {
    const { data: rows } = await supabase
      .from('stats')
      .select('goals_conceded, players!inner(id, name, is_goalkeeper), sessions(session_date)')
      .eq('players.is_goalkeeper', true);

    type Row = {
      goals_conceded: number;
      players: { id: string; name: string } | null;
      sessions: { session_date: string } | null;
    };

    const agg: Record<string, KeeperAgg> = {};
    for (const r of (rows ?? []) as unknown as Row[]) {
      const id = r.players?.id;
      const name = r.players?.name;
      const date = r.sessions?.session_date;
      if (!id || !name || !date) continue;
      if (monthStart && monthEnd && (date < monthStart || date > monthEnd)) continue;

      const a = (agg[id] ||= { id, name, conceded: 0, games: 0, cleanSheets: 0 });
      a.conceded += r.goals_conceded ?? 0;
      a.games += 1;
      if ((r.goals_conceded ?? 0) === 0) a.cleanSheets += 1;
    }

    setKeepers(Object.values(agg).sort(compareKeepers));
  }

  // Golden Glove = best goals-against average; tiebreak by more clean sheets,
  // then fewer total conceded.
  function compareKeepers(a: KeeperAgg, b: KeeperAgg): number {
    const gaa = (k: KeeperAgg) => (k.games > 0 ? k.conceded / k.games : Infinity);
    return gaa(a) - gaa(b) || b.cleanSheets - a.cleanSheets || a.conceded - b.conceded;
  }

  if (keepers.length === 0) return null;

  // Only crown a Golden Glove once a keeper has actually played.
  const goldenGloveId = keepers[0].games > 0 ? keepers[0].id : null;

  function buildShareText() {
    const lines: string[] = [];
    lines.push(`🧤 *SpartanStats — Keepers (${scopeLabel})*`, '');
    keepers.forEach((k) => {
      const glove = k.id === goldenGloveId ? ' 🧤' : '';
      lines.push(
        `${k.name}${glove}: ${k.conceded} conceded · ${k.cleanSheets} CS · ${k.games} game${k.games === 1 ? '' : 's'}`
      );
    });
    const gg = keepers.find((k) => k.id === goldenGloveId);
    if (gg) lines.push('', `🧤 Golden Glove: ${gg.name}`);
    return lines.join('\n');
  }

  async function handleShare() {
    const text = buildShareText();
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hand size={15} className="text-amber-300 shrink-0" />
          <h3 className="text-white font-semibold text-sm">Between the Sticks</h3>
        </div>
        <button
          onClick={handleShare}
          className={`shrink-0 rounded-lg p-1.5 transition ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
          }`}
          aria-label="Share keeper stats"
          title={copied ? 'Copied!' : 'Share to WhatsApp'}
        >
          <Share2 size={13} />
        </button>
      </div>

      <div className="space-y-1.5">
        {keepers.map((k) => {
          const isGlove = k.id === goldenGloveId;
          const gaa = k.games > 0 ? (k.conceded / k.games).toFixed(1) : '—';
          return (
            <Link
              key={k.id}
              href={`/players/${k.id}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-800 ${
                isGlove ? 'bg-amber-500/10 border border-amber-500/25' : 'bg-zinc-800/60'
              }`}
            >
              <span className="text-lg shrink-0">🧤</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate flex items-center gap-1.5">
                  {k.name}
                  {isGlove && (
                    <span className="text-amber-300 text-[9px] font-bold uppercase tracking-wide">
                      Golden Glove
                    </span>
                  )}
                </p>
                <p className="text-zinc-500 text-[11px] flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-400/80" />
                  {k.cleanSheets} clean sheet{k.cleanSheets === 1 ? '' : 's'} · {gaa} per game
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-rose-400 text-lg font-bold leading-none tabular-nums">{k.conceded}</p>
                <p className="text-zinc-600 text-[9px] font-medium uppercase tracking-wide mt-0.5">Conceded</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
