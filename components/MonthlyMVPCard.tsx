'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, Sparkles, CalendarCheck, TrendingUp, Share2 } from 'lucide-react';

interface PlayerStat {
  id: string;
  name: string;
  goals: number;
  assists: number;
  sessions: number;
}

interface Props {
  current: PlayerStat[];
  monthLabel: string;
  monthStart: string;
}

export default function MonthlyMVPCard({ current, monthLabel, monthStart }: Props) {
  const [prevByName, setPrevByName] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPrev();
  }, [monthStart]);

  async function fetchPrev() {
    const d = new Date(monthStart + 'T00:00:00');
    const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
    const prevEnd = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
    const { data: rows } = await supabase
      .from('stats')
      .select('goals, assists, players(name), sessions(session_date)')
      .gte('sessions.session_date', prevStart)
      .lte('sessions.session_date', prevEnd);

    const m: Record<string, number> = {};
    for (const r of (rows ?? []) as any[]) {
      const name = r.players?.name;
      const date = r.sessions?.session_date;
      if (!name || !date) continue;
      m[name] = (m[name] ?? 0) + r.goals + r.assists;
    }
    setPrevByName(m);
  }

  if (current.length === 0) return null;

  const mvp = [...current].sort((a, b) => {
    const d = b.goals + b.assists - (a.goals + a.assists);
    return d !== 0 ? d : b.goals - a.goals;
  })[0];

  const topScorer = [...current].sort((a, b) => {
    const d = b.goals - a.goals;
    return d !== 0 ? d : b.assists - a.assists;
  })[0];

  const playmaker = [...current].sort((a, b) => {
    const d = b.assists - a.assists;
    return d !== 0 ? d : b.goals - a.goals;
  })[0];

  const ironman = [...current].sort((a, b) => {
    const d = b.sessions - a.sessions;
    return d !== 0 ? d : b.goals + b.assists - (a.goals + a.assists);
  })[0];

  const improvements = current
    .map((p) => ({ p, delta: p.goals + p.assists - (prevByName[p.name] ?? 0), curPts: p.goals + p.assists }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => (b.delta !== a.delta ? b.delta - a.delta : b.curPts - a.curPts));
  const improved = improvements[0];

  const topScorerActive = topScorer && topScorer.goals > 0;
  const playmakerActive = playmaker && playmaker.assists > 0;

  function buildShareText() {
    const lines: string[] = [];
    lines.push(`🏆 *SpartanStats MVP — ${monthLabel}* 🏆`, '');
    lines.push(`👑 MVP: ${mvp.name} (${mvp.goals + mvp.assists} pts)`);
    if (topScorerActive) lines.push(`⚽ Top Scorer: ${topScorer.name} (${topScorer.goals}G)`);
    if (playmakerActive) lines.push(`🅰️ Playmaker: ${playmaker.name} (${playmaker.assists}A)`);
    lines.push(`📅 Iron Man: ${ironman.name} (${ironman.sessions} game${ironman.sessions === 1 ? '' : 's'})`);
    if (improved) lines.push(`📈 Most Improved: ${improved.p.name} (+${improved.delta} pts)`);
    lines.push('', 'Salute the legends 🫡');
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
    <div className="mb-5 bg-gradient-to-br from-rose-500/15 via-zinc-900 to-zinc-900 border border-rose-500/30 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider">{monthLabel} MVP</p>
          <p className="text-white text-xl font-bold mt-0.5 truncate">👑 {mvp.name}</p>
          <p className="text-zinc-400 text-xs mt-0.5">
            {mvp.goals + mvp.assists} pts · {mvp.goals}G · {mvp.assists}A
          </p>
        </div>
        <button
          onClick={handleShare}
          className={`shrink-0 rounded-lg p-2 transition ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
          }`}
          aria-label="Share MVP card"
          title={copied ? 'Copied!' : 'Share to WhatsApp'}
        >
          <Share2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {topScorerActive && (
          <SubAward icon={<Target size={12} />} label="Top Scorer" name={topScorer.name} value={`${topScorer.goals}G`} />
        )}
        {playmakerActive && (
          <SubAward icon={<Sparkles size={12} />} label="Playmaker" name={playmaker.name} value={`${playmaker.assists}A`} />
        )}
        <SubAward
          icon={<CalendarCheck size={12} />}
          label="Iron Man"
          name={ironman.name}
          value={`${ironman.sessions} game${ironman.sessions === 1 ? '' : 's'}`}
        />
        {improved && (
          <SubAward
            icon={<TrendingUp size={12} />}
            label="Most Improved"
            name={improved.p.name}
            value={`+${improved.delta}`}
          />
        )}
      </div>
    </div>
  );
}

function SubAward({
  icon,
  label,
  name,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-800/60 rounded-xl px-2.5 py-2 flex items-center gap-2">
      <span className="text-rose-400 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-white text-xs font-semibold truncate">
          {name} <span className="text-zinc-400 font-normal">· {value}</span>
        </p>
      </div>
    </div>
  );
}
