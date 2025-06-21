import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Search, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import type { Game, Tournament, GameParticipant, Player, Team } from "@shared/schema";

interface RawDataTableProps {
  tournamentId: string;
  selectedYear: string;
  selectedMonth: string;
  availableYears: number[];
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
}

export function RawDataTable({ tournamentId, selectedYear, selectedMonth, availableYears, onYearChange, onMonthChange }: RawDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const itemsPerPage = 10;

  // Fetch tournament info
  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
  });

  // Fetch only games for this specific tournament
  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games", tournamentId],
    queryFn: () => fetch(`/api/games?tournamentId=${tournamentId}`).then(res => res.json())
  });

  // Fetch players and teams for this tournament using correct endpoints
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: [`/api/tournaments/${tournamentId}/players`],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
  });

  // Fetch game participants for all games with full team/player data
  const { data: allParticipants = [] } = useQuery<any[]>({
    queryKey: ["/api/game-participants", tournamentId],
    queryFn: async () => {
      const participantPromises = games.map(async (game) => {
        const response = await fetch(`/api/games/${game.id}/participants`);
        const participants = await response.json();
        return participants.map((p: any) => ({ 
          ...p, 
          gameId: game.id,
          gameDate: game.date 
        }));
      });
      const results = await Promise.all(participantPromises);
      return results.flat();
    },
    enabled: games.length > 0
  });

  // Process game data with participants to show winners and losers
  const gameResults = useMemo(() => {
    return games.map(game => {
      const gameParticipants = allParticipants.filter(p => p.gameId === game.id);
      
      if (gameParticipants.length < 2) {
        return {
          game,
          winner: "No Participants",
          winnerScore: "-",
          loser: "No Participants",
          loserScore: "-"
        };
      }

      // Sort participants by score (highest first)
      const sortedParticipants = gameParticipants.sort((a, b) => 
        parseInt(b.score) - parseInt(a.score)
      );

      const winner = sortedParticipants[0];
      const loser = sortedParticipants[sortedParticipants.length - 1];

      // Special draw logic for Thornton tournament
      const isThorntonTournament = game.tournamentId === "a5558793-8f17-4ac5-81dc-9986db4c9e50";
      const winnerScore = parseInt(winner.score);
      const loserScore = parseInt(loser.score);
      const isDraw = isThorntonTournament && winnerScore === 6 && loserScore >= 1 && loserScore <= 5;

      // Get winner and loser names - use the names directly from the API response
      const getParticipantName = (participant: any) => {
        // The API already provides team_name and player_name, so use them directly
        if (participant.team_name) {
          return participant.team_name;
        }
        if (participant.player_name) {
          return participant.player_name;
        }
        
        // Fallback to the old logic only if API doesn't provide names
        if (participant.teamId) {
          const team = teams.find(t => t.id === participant.teamId);
          return team ? team.name : `Team ${participant.teamId}`;
        } 
        else if (participant.playerId) {
          const player = players.find(p => p.id === participant.playerId);
          return player ? player.name : `Player ${participant.playerId}`;
        }
        
        return "Unknown Participant";
      };

      return {
        game,
        winner: getParticipantName(winner), // Always show actual team names
        winnerScore: winner.score,
        loser: getParticipantName(loser), // Always show actual team names
        loserScore: loser.score,
        isDraw
      };
    });
  }, [games, allParticipants, players, teams]);

  // Get unique dates for the selected year/month
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    gameResults.forEach(result => {
      const gameDate = new Date(result.game.date);
      const gameYear = gameDate.getFullYear().toString();
      const gameMonth = (gameDate.getMonth() + 1).toString().padStart(2, '0');
      
      // Only include dates that match current year/month filters
      if ((selectedYear === 'all' || gameYear === selectedYear) &&
          (selectedMonth === 'all' || gameMonth === selectedMonth)) {
        dates.add(gameDate.toLocaleDateString());
      }
    });
    return Array.from(dates).sort().reverse(); // Most recent first
  }, [gameResults, selectedYear, selectedMonth]);

  // Reset date filter when year/month changes
  React.useEffect(() => {
    setSelectedDate('all');
  }, [selectedYear, selectedMonth]);

  // Filter and sort processed game results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = gameResults.filter(result => {
      const gameDate = new Date(result.game.date);
      const gameYear = gameDate.getFullYear().toString();
      const gameMonth = (gameDate.getMonth() + 1).toString().padStart(2, '0');
      const gameDateString = gameDate.toLocaleDateString();
      
      // Apply search filter
      const matchesSearch = !searchTerm || (
        result.winner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.loser.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gameDateString.includes(searchTerm) ||
        result.winnerScore.includes(searchTerm) ||
        result.loserScore.includes(searchTerm)
      );
      
      // Apply year filter
      const matchesYear = selectedYear === 'all' || gameYear === selectedYear;
      
      // Apply month filter
      const matchesMonth = selectedMonth === 'all' || gameMonth === selectedMonth;
      
      // Apply date filter
      const matchesDate = selectedDate === 'all' || gameDateString === selectedDate;
      
      return matchesSearch && matchesYear && matchesMonth && matchesDate;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      if (sortBy === "date") return new Date(b.game.date).getTime() - new Date(a.game.date).getTime();
      if (sortBy === "winner") return a.winner.localeCompare(b.winner);
      return 0;
    });
  }, [gameResults, searchTerm, sortBy, selectedYear, selectedMonth, selectedDate]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = filteredAndSortedResults.slice(startIndex, endIndex);

  const exportToCSV = () => {
    const headers = ["Date", "Winning Team/Player", "Winning Score", "Losing Team/Player", "Losing Score"];
    const rows = filteredAndSortedResults.map(result => [
      new Date(result.game.date).toLocaleDateString(),
      result.winner,
      result.winnerScore,
      result.loser,
      result.loserScore
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tournament?.name || 'tournament'}_match_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading raw data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Raw Tournament Data</CardTitle>
            <CardDescription>
              Complete match results with timestamps for full transparency
            </CardDescription>
          </div>
          <Button 
            onClick={exportToCSV} 
            variant="outline" 
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by team names, scores, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Date Filtering Controls */}
          <div className="flex items-center gap-2">
            <Label htmlFor="year-select" className="text-sm font-medium whitespace-nowrap">
              Year:
            </Label>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="month-select" className="text-sm font-medium whitespace-nowrap">
              Month:
            </Label>
            <Select value={selectedMonth} onValueChange={onMonthChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="01">January</SelectItem>
                <SelectItem value="02">February</SelectItem>
                <SelectItem value="03">March</SelectItem>
                <SelectItem value="04">April</SelectItem>
                <SelectItem value="05">May</SelectItem>
                <SelectItem value="06">June</SelectItem>
                <SelectItem value="07">July</SelectItem>
                <SelectItem value="08">August</SelectItem>
                <SelectItem value="09">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Filter - only show available dates based on year/month selection */}
          <div className="flex items-center gap-2">
            <Label htmlFor="date-select" className="text-sm font-medium whitespace-nowrap">
              Date:
            </Label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {availableDates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-48">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date (Newest First)</SelectItem>
                <SelectItem value="winner">Winner Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedResults.length)} of {filteredAndSortedResults.length} games
            {searchTerm && ` (filtered from ${gameResults.length} total)`}
          </p>
        </div>

        {/* Data Table */}
        {currentResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="mx-auto h-8 w-8 mb-4" />
            <p>No games found matching your search criteria.</p>
            <p className="text-sm mt-2">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Winning Score</TableHead>
                  <TableHead>Loser</TableHead>
                  <TableHead>Losing Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentResults.map((result, index) => (
                  <TableRow key={result.game.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {new Date(result.game.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(result.game.date).toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="text-green-700">{result.winner}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                        {result.winnerScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {result.loser}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600">
                        {result.loserScore}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}