import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tournament } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Users, Zap } from "lucide-react";

interface TournamentCardProps {
  tournament: Tournament;
  showDetailsLink?: boolean;
}

export default function TournamentCard({ tournament, showDetailsLink = false }: TournamentCardProps) {
  // Get game count for this specific tournament
  const { data: games } = useQuery({
    queryKey: [`/api/games?tournamentId=${tournament.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/games?tournamentId=${tournament.id}`);
      return response.json();
    }
  });

  // Get players count for this tournament
  const { data: players } = useQuery({
    queryKey: [`/api/tournaments/${tournament.id}/players`],
  });

  // Get random sports image based on tournament.id
  const sportImages = [
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?q=80&w=1200&auto=format&fit=crop"
  ];
  
  const imageIndex = tournament.id.length % sportImages.length;
  const imageUrl = tournament.image || sportImages[imageIndex];

  // Format date for display
  const formatDate = (dateString: string | undefined | Date) => {
    if (!dateString) return "";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const dateRange = `${formatDate(tournament.startDate)} ${tournament.endDate ? `- ${formatDate(tournament.endDate)}` : ''}`;

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <img className="h-48 w-full object-cover" src={imageUrl} alt={tournament.name} />
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-gray-900 truncate">{tournament.name}</h4>
          <Badge className={tournament.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
            {tournament.isActive ? "Active" : "Ended"}
          </Badge>
        </div>
        <div className="mt-2">
          <div className="flex items-center text-sm text-gray-500">
            <CalendarDays className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
            <span>{dateRange}</span>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
            <span>{Array.isArray(players) ? players.length : 0} {tournament.gameType?.toLowerCase().includes('team') ? 'teams' : 'players'}</span>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <Zap className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
            <span>{Array.isArray(games) ? games.length : 0} games played</span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="flex justify-between">
          <Link href={`/tournaments/${tournament.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">
            View Details
          </Link>
          <Link href={`/tournaments/${tournament.id}#games`} className="text-sm font-medium text-primary-600 hover:text-primary-900">
            Record Game
          </Link>
        </div>
      </div>
    </div>
  );
}
