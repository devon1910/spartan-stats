'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/useToast';
import Toast from '@/components/Toast';
import { BarChart2, Save, Plus, X, AlertTriangle } from 'lucide-react';

interface SessionFormProps {
  players: string[];
  sessionDate: string;
  onSave: () => void;
}

interface GoalEntry {
  scorer: string;
  assister: string | null;
}

const NONE = '__none__';

export default function SessionForm({ players, sessionDate, onSave }: SessionFormProps) {
  const [goals, setGoals] = useState<GoalEntry[]>([]);
  const [legacyAssists, setLegacyAssists] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    setGoals([]);
    setLegacyAssists(0);
    prefillExisting();
  }, [players, sessionDate]);

  async function prefillExisting() {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_date', sessionDate)
      .maybeSingle();

    if (!sessionData) return;

    const { data: events } = await supabase
      .from('goal_events')
      .select('id, scorer:scorer_id(name), assister:assister_id(name)')
      .eq('session_id', sessionData.id)
      .order('id', { ascending: true });

    if (!events) return;

    const reconstructed: GoalEntry[] = [];
    let legacy = 0;
    for (const e of events as any[]) {
      const scorer = e.scorer?.name ?? null;
      const assister = e.assister?.name ?? null;
      if (scorer) {
        reconstructed.push({ scorer, assister });
      } else if (assister) {
        // backfilled assist-only event — can't tie to a scorer
        legacy += 1;
      }
    }
    setGoals(reconstructed);
    setLegacyAssists(legacy);
  }

  const totals = useMemo(() => {
    const t: Record<string, { goals: number; assists: number }> = {};
    for (const p of players) t[p] = { goals: 0, assists: 0 };
    for (const g of goals) {
      if (t[g.scorer]) t[g.scorer].goals++;
      if (g.assister && t[g.assister]) t[g.assister].assists++;
    }
    return t;
  }, [goals, players]);

  const totalGoals = goals.length;
  const totalAssists = goals.filter((g) => g.assister).length;

  function addGoal() {
    setGoals((prev) => [...prev, { scorer: players[0], assister: null }]);
  }

  function updateGoal(index: number, patch: Partial<GoalEntry>) {
    setGoals((prev) =>
      prev.map((g, i) => {
        if (i !== index) return g;
        const next = { ...g, ...patch };
        if (next.assister === next.scorer) next.assister = null;
        return next;
      })
    );
  }

  function removeGoal(index: number) {
    setGoals((prev) => prev.filter((_, i) => i !== index));
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

      // Replace only scorer-bearing events for this session — preserves any
      // legacy assist-only events from the backfill so historical assist
      // counts aren't dropped.
      const { error: deleteError } = await supabase
        .from('goal_events')
        .delete()
        .eq('session_id', sessionData.id)
        .not('scorer_id', 'is', null);
      if (deleteError) throw deleteError;

      if (goals.length > 0) {
        const events = goals
          .map((g) => ({
            session_id: sessionData.id,
            scorer_id: playerMap[g.scorer],
            assister_id: g.assister ? playerMap[g.assister] ?? null : null,
          }))
          .filter((e) => e.scorer_id);
        if (events.length > 0) {
          const { error: insertError } = await supabase.from('goal_events').insert(events);
          if (insertError) throw insertError;
        }
      }

      // Derive stats from the full goal_events set (managed + preserved legacy)
      // and upsert only for players in the current roster — orphan stats rows
      // belonging to players the user removed from the roster are left alone.
      const { data: allEvents } = await supabase
        .from('goal_events')
        .select('scorer_id, assister_id')
        .eq('session_id', sessionData.id);

      const derivedByPlayerId: Record<string, { goals: number; assists: number }> = {};
      for (const e of (allEvents ?? []) as any[]) {
        if (e.scorer_id) {
          (derivedByPlayerId[e.scorer_id] ||= { goals: 0, assists: 0 }).goals++;
        }
        if (e.assister_id) {
          (derivedByPlayerId[e.assister_id] ||= { goals: 0, assists: 0 }).assists++;
        }
      }

      for (const name of players) {
        const playerId = playerMap[name];
        if (!playerId) continue;
        const t = derivedByPlayerId[playerId] ?? { goals: 0, assists: 0 };
        await supabase.from('stats').upsert(
          { session_id: sessionData.id, player_id: playerId, goals: t.goals, assists: t.assists },
          { onConflict: 'session_id,player_id' }
        );
      }

      showToast('Session saved!', true);
      onSave();
      // refresh legacy banner state in case anything changed
      prefillExisting();
    } catch (err) {
      console.error(err);
      showToast('Error saving — try again', false);
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

      {legacyAssists > 0 && (
        <div className="mb-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Preserving {legacyAssists} legacy assist{legacyAssists === 1 ? '' : 's'} from old data.
            Not editable here, but still counted in this session's totals.
          </span>
        </div>
      )}

      {/* Per-player totals (derived, read-only) */}
      <div className="mb-4">
        <p className="text-zinc-600 text-[11px] font-medium mb-2 px-1">Totals</p>
        <div className="flex flex-wrap gap-1.5">
          {players.map((name) => {
            const t = totals[name] ?? { goals: 0, assists: 0 };
            const active = t.goals + t.assists > 0;
            return (
              <span
                key={name}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  active
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                }`}
              >
                {name} <span className="opacity-70 ml-1">{t.goals}G·{t.assists}A</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Goals list */}
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-zinc-600 text-[11px] font-medium">
          Goals {totalGoals > 0 && <span className="text-zinc-500">({totalGoals} · {totalAssists} assisted)</span>}
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="bg-zinc-800/50 border border-dashed border-zinc-700 rounded-xl py-6 text-center text-zinc-600 text-xs mb-3">
          No goals yet. Tap below to add one.
        </div>
      ) : (
        <div className="space-y-1.5 mb-3">
          {goals.map((g, i) => (
            <div
              key={i}
              className="bg-zinc-800 rounded-xl px-2.5 sm:px-3 py-2 flex items-center gap-2"
            >
              <span className="text-rose-400 text-base shrink-0">⚽</span>
              <select
                value={g.scorer}
                onChange={(e) => updateGoal(i, { scorer: e.target.value })}
                className="flex-1 min-w-0 bg-zinc-900 text-white text-sm font-medium rounded-lg px-2 py-1.5 border border-zinc-700 focus:border-rose-500 focus:outline-none"
              >
                {players.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <span className="text-zinc-500 text-base shrink-0">🅰️</span>
              <select
                value={g.assister ?? NONE}
                onChange={(e) =>
                  updateGoal(i, { assister: e.target.value === NONE ? null : e.target.value })
                }
                className="flex-1 min-w-0 bg-zinc-900 text-zinc-300 text-sm rounded-lg px-2 py-1.5 border border-zinc-700 focus:border-rose-500 focus:outline-none"
              >
                <option value={NONE}>—</option>
                {players
                  .filter((p) => p !== g.scorer)
                  .map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
              </select>

              <button
                onClick={() => removeGoal(i)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition shrink-0"
                aria-label="Remove goal"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addGoal}
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium py-2.5 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2"
      >
        <Plus size={14} />
        Add goal
      </button>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 w-full bg-rose-500 hover:bg-rose-400 active:bg-rose-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
      >
        <Save size={15} />
        {saving ? 'Saving...' : 'Save Session'}
      </button>

      <Toast toast={toast} />
    </div>
  );
}
