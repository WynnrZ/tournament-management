import { useQuery } from "@tanstack/react-query";
import { LeaderboardEntry } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface LeaderboardTableProps {
  tournamentId: number;
}

export default function LeaderboardTable({ tournamentId }: LeaderboardTableProps) {
  // Use the dedicated leaderboard API endpoint
  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/tournaments/${tournamentId}/player-leaderboard`],
  });

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Get color classes for rank
  const getRankColorClasses = (rank: number) => {
    if (rank === 1) return "bg-primary-100 text-primary-700";
    if (rank === 2) return "bg-secondary-100 text-secondary-700";
    if (rank === 3) return "bg-accent-100 text-accent-700";
    return "bg-gray-100 text-gray-700";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500 mb-2">No games recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>W</TableHead>
            <TableHead>L</TableHead>
            <TableHead>Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.map((entry, index) => {
            const position = index + 1; // Calculate position from index
            const isTop = position === 1;
            const isBottom = position === leaderboard.length && leaderboard.length > 1;
            const rowClassName = isTop 
              ? "bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-400 hover:from-emerald-100 hover:to-green-100 shadow-sm"
              : isBottom 
              ? "bg-gradient-to-r from-rose-50 to-red-50 border-l-4 border-rose-400 hover:from-rose-100 hover:to-red-100 shadow-sm"
              : "";
            
            return (
              <TableRow key={entry.id} className={rowClassName}>
                <TableCell className="font-medium">
                  {position}
                </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarFallback className={getRankColorClasses(position)}>
                      {getInitials(entry.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{entry.name}</div>
                </div>
              </TableCell>
              <TableCell>
                {entry.wins}
              </TableCell>
              <TableCell>
                {entry.losses}
              </TableCell>
              <TableCell className="font-medium">
                {entry.points}
              </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
