'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Share2, Loader2 } from 'lucide-react';

interface PlayerStat {
  name: string;
  goals: number;
  assists: number;
  sessions: number;
}

const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [filter, setFilter] = useState<'month' | 'alltime'>('month');
  const [data, setData] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [filter]);

  async function fetchStats() {
    setLoading(true);
    let query = supabase.from('stats').select('goals, assists, players(name), sessions(session_date)');

    if (filter === 'month') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      query = query.gte('sessions.session_date', start).lte('sessions.session_date', end);
    }

    const { data: rows } = await query;

    if (!rows) {
      setData([]);
      setLoading(false);
      return;
    }

    const aggregated: Record<string, PlayerStat> = {};
    for (const row of rows) {
      const name = (row.players as any)?.name;
      const sessionDate = (row.sessions as any)?.session_date;
      if (!name || (filter === 'month' && !sessionDate)) continue;
      if (!aggregated[name]) aggregated[name] = { name, goals: 0, assists: 0, sessions: 0 };
      aggregated[name].goals += row.goals;
      aggregated[name].assists += row.assists;
      aggregated[name].sessions += 1;
    }

    const sorted = Object.values(aggregated).sort(
      (a, b) => b.goals + b.assists - (a.goals + a.assists)
    );
    setData(sorted);
    setLoading(false);
  }

  const [copied, setCopied] = useState(false);

  function buildShareText() {
    const now = new Date();
    const period = filter === 'month'
      ? now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : 'All Time';
    const totalGoals = data.reduce((s, p) => s + p.goals, 0);
    const totalAssists = data.reduce((s, p) => s + p.assists, 0);

    const pad = (s: string, n: number) => s.length >= n ? s : s + ' '.repeat(n - s.length);

    const rows = data.map((p, i) => {
      const rank = i < 3 ? RANK_ICONS[i] : `${i + 1}.`;
      return `${pad(rank, 3)} ${pad(p.name, 10)} ${String(p.goals).padStart(2)}G  ${String(p.assists).padStart(2)}A  ${String(p.goals + p.assists).padStart(2)}pts`;
    });

    return [
      `⚽ *SpartanStats — ${period}*`,
      '```',
      `${'#'.padEnd(3)} ${'Player'.padEnd(10)} G    A   Pts`,
      '──────────────────────────────',
      ...rows,
      '──────────────────────────────',
      `📊 ${data.length} players · ${totalGoals}G ${totalAssists}A`,
      '```',
    ].join('\n');
  }

  async function handleShare() {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for browsers that block clipboard without HTTPS
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(['month', 'alltime'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              filter === f
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
            }`}
          >
            {f === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-zinc-600 py-16">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : data.length === 0 ? (
        <p className="text-zinc-600 text-center py-16 text-sm">No stats logged yet for this period.</p>
      ) : (
        <>
          {data.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 mb-5">
              {([data[1], data[0], data[2]] as const).map((player, podiumIdx) => {
                if (!player) return <div key={podiumIdx} />;
                const rankIdx = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
                const barH = ['h-16', 'h-24', 'h-12'];
                const barColor = ['bg-zinc-700', 'bg-rose-500', 'bg-zinc-800'];
                return (
                  <div key={player.name} className="flex flex-col items-center">
                    <span className="text-xl mb-0.5">{RANK_ICONS[rankIdx]}</span>
                    <span className="text-white text-xs font-bold text-center truncate w-full px-1 text-center">
                      {player.name}
                    </span>
                    <span className="text-rose-400 text-xs font-semibold mb-1">
                      {player.goals + player.assists} pts
                    </span>
                    <div className={`w-full ${barH[podiumIdx]} ${barColor[podiumIdx]} rounded-t-lg`} />
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-600 text-xs border-b border-zinc-800">
                  <th className="text-left px-3 sm:px-4 py-3 font-medium w-10">#</th>
                  <th className="text-left px-2 py-3 font-medium">Player</th>
                  <th className="text-center px-2 py-3 font-medium">⚽</th>
                  <th className="text-center px-2 py-3 font-medium">🅰️</th>
                  <th className="text-center px-2 py-3 font-medium">Pts</th>
                  <th className="text-center px-2 py-3 font-medium hidden sm:table-cell">Games</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={row.name}
                    className={`border-b border-zinc-800 last:border-0 ${i === 0 ? 'bg-rose-500/5' : ''}`}
                  >
                    <td className="px-3 sm:px-4 py-3">
                      {i < 3 ? (
                        <span className="text-base">{RANK_ICONS[i]}</span>
                      ) : (
                        <span className="text-zinc-600 text-xs">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-white font-medium">{row.name}</td>
                    <td className="px-2 py-3 text-center text-rose-400 font-semibold">{row.goals}</td>
                    <td className="px-2 py-3 text-center text-zinc-400 font-semibold">{row.assists}</td>
                    <td className="px-2 py-3 text-center text-white font-bold">{row.goals + row.assists}</td>
                    <td className="px-2 py-3 text-center text-zinc-600 hidden sm:table-cell">{row.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleShare}
            className={`mt-4 w-full font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 ${
              copied
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Share2 size={15} />
            {copied ? 'Copied! Paste into WhatsApp' : 'Share to WhatsApp'}
          </button>
        </>
      )}
    </div>
  );
}
