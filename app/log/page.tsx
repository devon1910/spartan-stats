'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import TuesdayCalendar from '@/components/TuesdayCalendar';
import PlayerInput from '@/components/PlayerInput';
import SessionForm from '@/components/SessionForm';

export default function LogPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-5">
      <TuesdayCalendar onSelectDate={setSelectedDate} selectedDate={selectedDate} />
      <PlayerInput onConfirm={setPlayers} />
      {selectedDate && players.length > 0 && (
        <SessionForm
          players={players}
          sessionDate={selectedDate}
          onSave={() => {}}
        />
      )}
      {!selectedDate && (
        <p className="text-gray-600 text-sm text-center">Select a Tuesday to log stats</p>
      )}
      {selectedDate && players.length === 0 && (
        <p className="text-gray-600 text-sm text-center">Add players to continue</p>
      )}
    </div>
  );
}
