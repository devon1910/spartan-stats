export interface MonthPeriod {
  start: string;
  end: string;
  label: string;
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthPeriod(offset = 0, reference = new Date()): MonthPeriod {
  const start = new Date(reference.getFullYear(), reference.getMonth() + offset, 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + offset + 1, 0);

  return {
    start: toLocalIsoDate(start),
    end: toLocalIsoDate(end),
    label: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
  };
}

export function getPreviousMonthPeriod(monthStart: string): MonthPeriod {
  const [year, month] = monthStart.split('-').map(Number);
  return getMonthPeriod(-1, new Date(year, month - 1, 1));
}
