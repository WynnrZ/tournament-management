import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Game, GameParticipant, Player, Tournament } from "@shared/schema";

interface GameResultItemProps {
  game: Game;
}

function GameResultItem({ game }: GameResultItemProps) {
  // Fetch tournament
  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${game.tournamentId}`],
    enabled: !!game.tournamentId,
  });

  // Fetch game participants
  const { data: participants = [] } = useQuery<GameParticipant[]>({
    queryKey: [`/api/games/${game.id}/participants`],
  });

  // Get all players (not tournament-specific since tournamentId might be undefined)
  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  // Format date using created_at for actual time, fallback to date field
  const getTimeAgo = (game: Game) => {
    // Use created_at for actual game recording time, fallback to date field
    const gameTime = game.createdAt || game.date;
    const gameDate = typeof gameTime === 'string' ? new Date(gameTime) : gameTime;
    
    // Ensure we have a valid date
    if (isNaN(gameDate.getTime())) {
      return 'Unknown';
    }
    return formatDistanceToNow(gameDate, { addSuffix: true });
  };

  // Get display name (team name or player name)
  const getDisplayName = (participant: any) => {
    // If it's a team game, show team name (API returns team_name)
    if (participant.team_name || participant.teamName) {
      return participant.team_name || participant.teamName;
    }
    
    // If it has player_name from API, use that
    if (participant.player_name || participant.playerName) {
      return participant.player_name || participant.playerName;
    }
    
    // If it's individual player, show player name
    if (participant.playerId) {
      const player = allPlayers.find(p => p.id === participant.playerId);
      return player?.name || "Unknown Player";
    }
    
    return "Unknown";
  };

  // Get game result display
  const getGameResult = () => {
    if (!participants || participants.length === 0) return "No results";

    if (participants.length === 2) {
      // Two-player game (most common)
      const [p1, p2] = participants;
      return (
        <div className="flex items-center">
          <span className="font-medium text-gray-900">{getDisplayName(p1)}</span>
          <span className="ml-1 font-bold text-gray-900">{p1.score}</span>
          <span className="mx-2 text-gray-500">vs</span>
          <span className="font-medium text-gray-900">{getDisplayName(p2)}</span>
          <span className="ml-1 font-bold text-gray-900">{p2.score}</span>
        </div>
      );
    }
    
    // For multiplayer games
    return (
      <div className="flex items-center">
        <span className="text-gray-600">{participants.length} players</span>
      </div>
    );
  };

  return (
    <li className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <p className="text-sm font-medium text-gray-900">
            {tournament?.name || (game.tournamentId ? "Loading tournament..." : "General Games")}
          </p>
          <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
            {tournament?.gameType || "Game"}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">{getTimeAgo(game)}</p>
      </div>
      <div className="mt-2 sm:flex sm:justify-between">
        <div className="sm:flex">
          <div className="flex items-center mt-2 text-sm text-gray-500 sm:mt-0">
            {getGameResult()}
          </div>
        </div>
      </div>
    </li>
  );
}

export default GameResultItem;