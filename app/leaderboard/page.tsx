export const dynamic = 'force-dynamic';

import Leaderboard from '@/components/Leaderboard';

export default function LeaderboardPage() {
  return (
    <div>
      <h2 className="text-white font-bold text-lg sm:text-xl mb-5">Leaderboard</h2>
      <Leaderboard />
    </div>
  );
}
