'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart2, Save, Check, AlertCircle, Plus, Minus } from 'lucide-react';

interface SessionFormProps {
  players: string[];
  sessionDate: string;
  onSave: () => void;
}

interface StatRow {
  name: string;
  goals: number;
  assists: number;
}

export default function SessionForm({ players, sessionDate, onSave }: SessionFormProps) {
  const [stats, setStats] = useState<StatRow[]>(
    players.map((name) => ({ name, goals: 0, assists: 0 }))
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    setStats(players.map((name) => ({ name, goals: 0, assists: 0 })));
    prefillExisting();
  }, [players, sessionDate]);

  async function prefillExisting() {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_date', sessionDate)
      .single();

    if (!sessionData) return;

    const { data: existingStats } = await supabase
      .from('stats')
      .select('goals, assists, players(name)')
      .eq('session_id', sessionData.id);

    if (existingStats && existingStats.length > 0) {
      setStats((prev) =>
        prev.map((row) => {
          const match = existingStats.find((s: any) => s.players?.name === row.name);
          return match ? { ...row, goals: match.goals, assists: match.assists } : row;
        })
      );
    }
  }

  function bump(index: number, field: 'goals' | 'assists', delta: number) {
    setStats((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: Math.max(0, row[field] + delta) } : row
      )
    );
  }

  function setDirect(index: number, field: 'goals' | 'assists', raw: string) {
    const value = parseInt(raw, 10);
    if (isNaN(value)) return;
    setStats((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: Math.max(0, value) } : row))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const name of players) {
        await supabase.from('players').upsert({ name }, { onConflict: 'name' });
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .upsert({ session_date: sessionDate }, { onConflict: 'session_date' })
        .select('id')
        .single();

      if (sessionError || !sessionData) throw new Error('Failed to save session');

      const { data: playerRows } = await supabase
        .from('players')
        .select('id, name')
        .in('name', players);

      if (!playerRows) throw new Error('Failed to fetch players');

      const playerMap = Object.fromEntries(playerRows.map((p) => [p.name, p.id]));

      for (const row of stats) {
        const playerId = playerMap[row.name];
        if (!playerId) continue;
        await supabase.from('stats').upsert(
          { session_id: sessionData.id, player_id: playerId, goals: row.goals, assists: row.assists },
          { onConflict: 'session_id,player_id' }
        );
      }

      setToast({ msg: 'Session saved!', ok: true });
      setTimeout(() => setToast(null), 3000);
      onSave();
    } catch (err) {
      console.error(err);
      setToast({ msg: 'Error saving — check console', ok: false });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const formattedDate = new Date(sessionDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 size={15} className="text-rose-400 shrink-0" />
        <h2 className="text-white font-semibold text-sm">Match Stats</h2>
      </div>
      <p className="text-zinc-600 text-xs mb-4 ml-5">{formattedDate}</p>

      {/* Column headers */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 mb-1">
        <span className="flex-1 text-zinc-600 text-[11px] font-medium">Player</span>
        <span className="w-28 text-center text-zinc-600 text-[11px] font-medium">⚽ Goals</span>
        <span className="w-28 text-center text-zinc-600 text-[11px] font-medium">🅰️ Assists</span>
      </div>

      <div className="space-y-1.5">
        {stats.map((row, i) => (
          <div
            key={row.name}
            className="bg-zinc-800 rounded-xl px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3"
          >
            <span className="text-white font-medium text-sm flex-1 min-w-0 truncate">{row.name}</span>

            {(['goals', 'assists'] as const).map((field) => (
              <div key={field} className="flex items-center gap-1 w-28 justify-center">
                <button
                  onClick={() => bump(i, field, -1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-400 transition active:scale-90"
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  min={0}
                  value={row[field]}
                  onChange={(e) => setDirect(i, field, e.target.value)}
                  className="w-8 bg-transparent text-white text-center text-sm font-bold focus:outline-none"
                />
                <button
                  onClick={() => bump(i, field, 1)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition active:scale-90 ${
                    field === 'goals'
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  }`}
                >
                  <Plus size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 w-full bg-rose-500 hover:bg-rose-400 active:bg-rose-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
      >
        <Save size={15} />
        {saving ? 'Saving...' : 'Save Session'}
      </button>

      {toast && (
        <div
          className={`mt-3 flex items-center justify-center gap-1.5 text-sm font-medium ${
            toast.ok ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
