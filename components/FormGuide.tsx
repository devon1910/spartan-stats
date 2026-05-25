interface FormGuideProps {
  // newest first, length up to 5
  entries: ({ pts: number } | null)[];
}

// renders 5 chips: null = didn't play (dashed), 0 = played but no pts, 1+ = pts colored
export default function FormGuide({ entries }: FormGuideProps) {
  const slots = [...entries];
  while (slots.length < 5) slots.push(null);

  return (
    <div className="flex items-center gap-1">
      {slots.slice(0, 5).map((slot, i) => {
        if (slot === null) {
          return (
            <span
              key={i}
              className="w-5 h-5 rounded-md border border-dashed border-zinc-700 bg-transparent"
              title="Didn't play"
            />
          );
        }
        const pts = slot.pts;
        const cls =
          pts === 0
            ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
            : pts === 1
            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            : pts === 2
            ? 'bg-rose-500/35 text-rose-100 border-rose-500/50'
            : 'bg-rose-500/70 text-white border-rose-400';
        return (
          <span
            key={i}
            className={`w-5 h-5 rounded-md border text-[10px] font-bold flex items-center justify-center ${cls}`}
            title={`${pts} pt${pts === 1 ? '' : 's'}`}
          >
            {pts}
          </span>
        );
      })}
    </div>
  );
}
