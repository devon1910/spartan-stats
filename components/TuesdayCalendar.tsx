'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface TuesdayCalendarProps {
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

export default function TuesdayCalendar({ onSelectDate, selectedDate }: TuesdayCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [existingSessions, setExistingSessions] = useState<string[]>([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    fetchSessions();
  }, [currentMonth]);

  async function fetchSessions() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('sessions')
      .select('session_date')
      .gte('session_date', start)
      .lte('session_date', end);

    if (data) setExistingSessions(data.map((s) => s.session_date));
  }

  function getTuesdays(): Date[] {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const tuesdays: Date[] = [];
    const d = new Date(year, month, 1);
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    while (d.getMonth() === month) {
      tuesdays.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
    return tuesdays;
  }

  function formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  const tuesdays = getTuesdays();
  const monthLabel = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={15} className="text-rose-400 shrink-0" />
        <h2 className="text-white font-semibold text-sm">Select a Tuesday</h2>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm sm:text-base">{monthLabel}</span>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tuesdays.map((tue) => {
          const dateStr = formatDate(tue);
          const isToday = tue.getTime() === today.getTime();
          const hasSession = existingSessions.includes(dateStr);
          const isSelected = selectedDate === dateStr;
          const isFuture = tue > today;

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && onSelectDate(dateStr)}
              disabled={isFuture}
              className={`
                min-h-[64px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-medium transition active:scale-95
                ${isSelected ? 'bg-rose-500 text-white ring-2 ring-rose-400 ring-offset-1 ring-offset-zinc-900' : ''}
                ${!isSelected && hasSession ? 'bg-zinc-800 text-rose-300 ring-1 ring-rose-500/40' : ''}
                ${!isSelected && isToday && !hasSession ? 'bg-zinc-800 text-white ring-1 ring-zinc-600' : ''}
                ${!isSelected && !hasSession && !isToday && !isFuture ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : ''}
                ${isFuture ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-base font-bold">{tue.getDate()}</span>
              {hasSession && !isSelected && <span className="text-xs leading-none">⚽</span>}
              {isToday && !isSelected && <span className="text-[10px] text-rose-400 font-semibold leading-none">TODAY</span>}
              {isSelected && <span className="text-[10px] opacity-75 leading-none">✓ picked</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
