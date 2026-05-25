import PlayerProfile from './PlayerProfile';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return <p className="text-zinc-500 text-sm text-center py-16">Invalid player.</p>;
  }
  return <PlayerProfile playerId={numericId} />;
}
