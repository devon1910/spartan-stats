'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import TuesdayCalendar from '@/components/TuesdayCalendar';
import PlayerInput from '@/components/PlayerInput';
import SessionForm from '@/components/SessionForm';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/useToast';
import { Loader2 } from 'lucide-react';

export default function LogPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  // key used to reset PlayerInput when a new date is picked
  const [inputKey, setInputKey] = useState(0);
  const { toast, showToast } = useToast();

  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setPlayers([]);
    setInputKey((k) => k + 1);
    setLoadingSession(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_date', date)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (sessionData) {
        const { data: statsRows, error: statsError } = await supabase
          .from('stats')
          .select('players(name, is_goalkeeper)')
          .eq('session_id', sessionData.id);

        if (statsError) throw statsError;

        if (statsRows && statsRows.length > 0) {
          // Keepers are managed in their own section of the form, not the
          // outfield roster — keep them out of the player list.
          const names = statsRows
            .map((r: any) => r.players)
            .filter((p: any) => p?.name && !p.is_goalkeeper)
            .map((p: any) => p.name) as string[];
          setPlayers(names);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load session — try again', false);
    } finally {
      setLoadingSession(false);
    }
  }, [showToast]);

  return (
    <div className="flex flex-col gap-5">
      <Toast toast={toast} />
      <TuesdayCalendar onSelectDate={handleSelectDate} selectedDate={selectedDate} />

      {loadingSession ? (
        <div className="flex items-center justify-center gap-2 text-zinc-600 py-6">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading session…</span>
        </div>
      ) : (
        <>
          {!selectedDate && (
            <p className="text-zinc-600 text-sm text-center">Select a Tuesday to log stats</p>
          )}

          {selectedDate && (
            <PlayerInput
              key={inputKey}
              initialPlayers={players}
              onConfirm={setPlayers}
            />
          )}

          {selectedDate && players.length > 0 && (
            <SessionForm
              players={players}
              sessionDate={selectedDate}
              onSave={() => {}}
            />
          )}

          {selectedDate && players.length === 0 && (
            <p className="text-zinc-600 text-sm text-center">Add players to continue..</p>
          )}
        </>
      )}
    </div>
  );
}
