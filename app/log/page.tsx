'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import TuesdayCalendar from '@/components/TuesdayCalendar';
import PlayerInput from '@/components/PlayerInput';
import SessionForm from '@/components/SessionForm';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function LogPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  // key used to reset PlayerInput when a new date is picked
  const [inputKey, setInputKey] = useState(0);

  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setPlayers([]);
    setInputKey((k) => k + 1);
    setLoadingSession(true);

    try {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_date', date)
        .single();

      if (sessionData) {
        const { data: statsRows } = await supabase
          .from('stats')
          .select('players(name)')
          .eq('session_id', sessionData.id);

        if (statsRows && statsRows.length > 0) {
          const names = statsRows
            .map((r: any) => r.players?.name)
            .filter(Boolean) as string[];
          setPlayers(names);
        }
      }
    } finally {
      setLoadingSession(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <TuesdayCalendar onSelectDate={handleSelectDate} selectedDate={selectedDate} />

      {loadingSession ? (
        <div className="flex items-center justify-center gap-2 text-zinc-600 py-6">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading session…</span>
        </div>
      ) : (
        <>
          <PlayerInput
            key={inputKey}
            initialPlayers={players}
            onConfirm={setPlayers}
          />

          {selectedDate && players.length > 0 && (
            <SessionForm
              players={players}
              sessionDate={selectedDate}
              onSave={() => {}}
            />
          )}

          {!selectedDate && (
            <p className="text-zinc-600 text-sm text-center">Select a Tuesday to log stats</p>
          )}

          {selectedDate && !loadingSession && players.length === 0 && (
            <p className="text-zinc-600 text-sm text-center">Add players to continue..</p>
          )}
        </>
      )}
    </div>
  );
}
