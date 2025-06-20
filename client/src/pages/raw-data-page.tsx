import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Game, GameParticipant, Tournament, Player, Team } from "@shared/schema";

export default function RawDataPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [sortBy, setSortBy] = useState<string>("date");

  // Fetch tournament info
  const { data: tournament } = useQuery<Tournament>({
    queryKey: ["/api/tournaments", tournamentId],
  });

  // Fetch all games for this tournament
  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games", { tournamentId }],
    queryFn: () => fetch(`/api/games?tournamentId=${tournamentId}`).then(res => res.json())
  });

  // Fetch players for this tournament
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/tournaments", tournamentId, "players"],
  });

  // Fetch teams for this tournament
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/tournaments", tournamentId, "teams"],
  });

  // Sort games
  const sortedGames = games
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "id") return b.id - a.id;
      return 0;
    });

  const exportToCSV = () => {
    const headers = ["Game ID", "Date", "Notes"];
    const rows = sortedGames.map(game => [
      game.id,
      new Date(game.date).toLocaleString(),
      game.notes || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tournament?.name || 'tournament'}_raw_data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1 pb-16 md:pb-0">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading raw data...</p>
              </div>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 md:pb-0">
          <div className="py-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                    Raw Tournament Data
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {tournament?.name} - Complete match results and scoring transparency
                  </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                  <Button onClick={exportToCSV} className="mr-2">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              {/* Tournament Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{sortedGames.length}</div>
                    <p className="text-sm text-gray-500">Total Games Recorded</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{players.length}</div>
                    <p className="text-sm text-gray-500">Tournament Players</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{teams.length}</div>
                    <p className="text-sm text-gray-500">Tournament Teams</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Data Filters</h3>
                      <CardDescription>
                        Sort and filter the raw data to view specific information
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {sortedGames.length} games shown
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date (Newest First)</SelectItem>
                          <SelectItem value="id">Game ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Raw Data Table */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Complete Game Results</h3>
                  <CardDescription>
                    All recorded game results with timestamps for full transparency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedGames.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Eye className="mx-auto h-8 w-8 mb-4" />
                      <p>No game data found for this tournament.</p>
                      <p className="text-sm mt-2">Record some games to see raw data here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Game ID</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Tournament</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedGames.map((game) => (
                            <TableRow key={game.id}>
                              <TableCell className="font-medium">
                                <Badge variant="outline">#{game.id}</Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {new Date(game.date).toLocaleDateString()}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(game.date).toLocaleTimeString()}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{tournament?.name}</div>
                                <div className="text-sm text-gray-500">ID: {tournamentId}</div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                                {game.notes || "-"}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.open(`/tournaments/${tournamentId}`, '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tournament Details */}
              <Card className="mt-6">
                <CardHeader>
                  <h3 className="text-lg font-medium">Tournament Information</h3>
                  <CardDescription>
                    Detailed information about this tournament for data context
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tournament Name</label>
                      <p className="font-medium">{tournament?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="font-medium">{tournament?.description || "No description"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Game Type</label>
                      <p className="font-medium">{tournament?.gameType || "Standard"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <Badge variant={tournament?.isActive ? "default" : "secondary"}>
                        {tournament?.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Start Date</label>
                      <p className="font-medium">
                        {tournament?.startDate ? new Date(tournament.startDate).toLocaleDateString() : "Not set"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">End Date</label>
                      <p className="font-medium">
                        {tournament?.endDate ? new Date(tournament.endDate).toLocaleDateString() : "Not set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}