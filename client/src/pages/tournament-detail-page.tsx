import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tournament, Player, Team } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, ArrowLeft, Users, CalendarDays, Edit, Plus, Shield, 
  ClipboardCheck, AlertTriangle, UserX, FileText, Eye, Camera, Upload,
  Trash2, Settings, MoreVertical, Search, UserPlus, UserMinus
} from "lucide-react";
import FeedbackForm from "@/components/feedback/feedback-form";
import { TournamentLeaderboards } from "@/components/leaderboards/tournament-leaderboards";
import RecordGameForm from "@/components/games/record-game-form";

import PlayerForm from "@/components/players/player-form";
import { PlayerListWithPermissions } from "@/components/players/player-list-with-permissions";
import TeamList from "@/components/teams/team-list";
import { AdminActivityLogs } from "@/components/admin/admin-activity-logs";
import { useTournamentPermissions } from "@/hooks/use-tournament-permissions";
import { useAuth } from "@/hooks/use-auth";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Component to display game participants
function GameParticipants({ gameId }: { gameId: string }) {
  const { data: participants, isLoading } = useQuery({
    queryKey: [`/api/games/${gameId}/participants`],
  });

  if (isLoading) return <span className="text-gray-500">Loading...</span>;
  if (!participants || participants.length === 0) return <span className="text-gray-500">No participants</span>;

  // Log the data to debug
  console.log("Participants data for game", gameId, ":", participants);

  const winners = participants.filter((p: any) => p.isWinner);
  const losers = participants.filter((p: any) => !p.isWinner);
  
  // Try different field names for team/player names - filter out empty/null names
  const winnerNames = winners.map((p: any) => 
    p.teamName || p.playerName || p.team_name || p.player_name
  ).filter(name => name).join(", ");
  
  const loserNames = losers.map((p: any) => 
    p.teamName || p.playerName || p.team_name || p.player_name
  ).filter(name => name).join(", ");
  
  // If we have both winners and losers with names
  if (winnerNames && loserNames) {
    return <span>{winnerNames} vs {loserNames}</span>;
  }
  
  // If no winner/loser distinction but we have names, show all participants
  const allNames = participants.map((p: any) => 
    p.teamName || p.playerName || p.team_name || p.player_name
  ).filter(name => name).join(" vs ");
  
  return <span>{allNames || "Loading participants..."}</span>;
}

// Component to display game result
function GameResult({ gameId }: { gameId: string }) {
  const { data: participants, isLoading } = useQuery({
    queryKey: [`/api/games/${gameId}/participants`],
  });

  if (isLoading) return <span className="text-gray-500">Loading...</span>;
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return <span className="text-gray-500">No result</span>;
  }

  const winners = participants.filter((p: any) => p.isWinner || p.is_winner);
  const losers = participants.filter((p: any) => !p.isWinner && !p.is_winner);
  
  if (winners.length > 0 && losers.length > 0) {
    const winnerScore = winners[0].score || 0;
    const loserScore = losers[0].score || 0;
    const winnerName = winners.map((p: any) => 
      p.teamName || p.playerName || p.team_name || p.player_name || "Winner"
    ).join(", ");
    
    return (
      <span className="font-medium text-green-600">
        {winnerName} won {winnerScore}-{loserScore}
      </span>
    );
  }
  
  return <span className="text-gray-500">TBD</span>;
}

export default function TournamentDetailPage() {
  const [_, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id; // Keep as string UUID
  const { toast } = useToast();
  const { isAdmin, canRecordResults } = useTournamentPermissions(tournamentId);

  const [recordGameDialogOpen, setRecordGameDialogOpen] = useState(false);
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [imageUploadDialogOpen, setImageUploadDialogOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [addTeamDialogOpen, setAddTeamDialogOpen] = useState(false);
  const [gameDetailDialogOpen, setGameDetailDialogOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [tournamentDeleteDialogOpen, setTournamentDeleteDialogOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerActionDialogOpen, setPlayerActionDialogOpen] = useState(false);

  // Get user information
  const { user } = useAuth();
  
  // Debug admin permissions
  console.log('Tournament management debug:', {
    user: user?.name,
    isAdmin,
    canRecordResults,
    userIsAppAdmin: user?.isAppAdmin,
    tournamentId
  });

  // Fetch tournament details
  const { data: tournament, isLoading: isLoadingTournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
  });

  // Fetch tournament players
  const { data: players, isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: [`/api/tournaments/${tournamentId}/players`],
  });

  // Fetch all games for this tournament
  const { data: games, isLoading: isLoadingGames } = useQuery({
    queryKey: [`/api/games`, { tournamentId }],
    queryFn: async () => {
      const response = await fetch(`/api/games?tournamentId=${tournamentId}`);
      return response.json();
    }
  });
  
  // Fetch teams for this tournament
  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
  });

  // Fetch selected game details
  const { data: selectedGameParticipants, isLoading: isLoadingGameDetails } = useQuery({
    queryKey: [`/api/games/${selectedGameId}/participants`],
    enabled: !!selectedGameId,
  });

  // Fetch selected game info
  const { data: selectedGame } = useQuery({
    queryKey: [`/api/games/${selectedGameId}`],
    enabled: !!selectedGameId,
  });

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "TBD";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  // Mutation for updating tournament image
  const updateTournamentImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest("PATCH", `/api/tournaments/${tournamentId}`, { image: imageUrl });
      if (!res.ok) throw new Error("Failed to update tournament image");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({ title: "Tournament image updated successfully" });
      setImageUploadDialogOpen(false);
      setUploadedImageUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tournament image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deactivating tournament
  const deactivateTournamentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/tournaments/${tournamentId}`, { isActive: false });
      if (!res.ok) throw new Error("Failed to deactivate tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({ title: "Tournament deactivated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to deactivate tournament",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting tournament
  const deleteTournamentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/tournaments/${tournamentId}`);
      if (!res.ok) throw new Error("Failed to delete tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({ title: "Tournament deleted successfully" });
      setLocation("/tournaments");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tournament",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for removing player from tournament
  const removePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const res = await apiRequest("DELETE", `/api/tournaments/${tournamentId}/players/${playerId}`);
      if (!res.ok) throw new Error("Failed to remove player from tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/players`] });
      toast({ title: "Player removed from tournament successfully" });
      setPlayerActionDialogOpen(false);
      setSelectedPlayer(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove player from tournament",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter players based on search query
  const filteredPlayers = players?.filter((player: Player) =>
    player.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
  ) || [];

  if (isLoadingTournament) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tournament not found</h2>
          <Button onClick={() => setLocation("/tournaments")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 md:pb-0">
          <div className="py-6">
            {/* Header with Back Button */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center mb-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation("/tournaments")}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{tournament.name}</h2>
                      <div className="flex items-center mt-1">
                        <Badge className={tournament.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {tournament.isActive ? "Active" : "Ended"}
                        </Badge>
                        <span className="text-sm text-gray-500 ml-2">{tournament.gameType}</span>
                      </div>
                    </div>
                    {(isAdmin || user?.isAppAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Tournament actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {tournament.isActive && (
                            <DropdownMenuItem
                              onClick={() => deactivateTournamentMutation.mutate()}
                              disabled={deactivateTournamentMutation.isPending}
                            >
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Deactivate Tournament
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setTournamentDeleteDialogOpen(true)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Tournament
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Info Card */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center mb-4 md:mb-0">
                      <CalendarDays className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {formatDate(tournament.startDate?.toString())} - {formatDate(tournament.endDate?.toString())}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {isLoadingPlayers ? "Loading..." : `${players?.length || 0} participants`}
                        </span>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImageUploadDialogOpen(true)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Update Image
                        </Button>
                      )}
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
                      <FeedbackForm 
                        tournamentId={tournament.id} 
                        tournamentName={tournament.name} 
                      />
                      
                      {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => setLocation(`/tournaments/${tournament.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Tournament
                        </Button>
                      )}

                      <Button size="sm" onClick={() => setRecordGameDialogOpen(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Record Game
                      </Button>
                    </div>
                  </div>
                  {tournament.description && (
                    <div className="mt-4 text-gray-600">
                      {tournament.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different sections */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Tabs defaultValue={window.location.hash === '#games' ? 'games' : 'leaderboard'}>
                <TabsList>
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                  <TabsTrigger value="games">Games</TabsTrigger>
                  <TabsTrigger value="players">Players</TabsTrigger>
                  <TabsTrigger value="teams">Teams</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value="admin-logs">
                      <FileText className="w-4 h-4 mr-2" /> 
                      Admin Logs
                    </TabsTrigger>
                  )}
                </TabsList>
                
                {/* Leaderboard Tab */}
                <TabsContent value="leaderboard">
                  <div className="mb-6">
                    <TournamentLeaderboards tournamentId={tournamentId} />
                  </div>
                </TabsContent>
                
                {/* Games Tab */}
                <TabsContent value="games">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Games</h3>
                        <Button size="sm" onClick={() => setRecordGameDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Record Game
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingGames ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : games?.length === 0 ? (
                        <div className="text-center p-6">
                          <p className="text-gray-500 mb-4">No games recorded yet.</p>
                          <Button size="sm" onClick={() => setRecordGameDialogOpen(true)}>
                            Record First Game
                          </Button>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Participants</TableHead>
                              <TableHead>Result</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {games?.map((game: any) => (
                              <TableRow key={game.id}>
                                <TableCell>{format(new Date(game.date), "MMM dd, yyyy")}</TableCell>
                                <TableCell>
                                  <GameParticipants gameId={game.id} />
                                </TableCell>
                                <TableCell>
                                  <GameResult gameId={game.id} />
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setSelectedGameId(game.id);
                                    setGameDetailDialogOpen(true);
                                  }}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Players Tab */}
                <TabsContent value="players">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">
                          Players
                          {canRecordResults && !isAdmin && (
                            <Badge variant="secondary" className="ml-2 bg-primary/10">
                              <ClipboardCheck className="h-3 w-3 mr-1" /> You can record results
                            </Badge>
                          )}
                          {isAdmin && (
                            <Badge variant="secondary" className="ml-2 bg-primary/10">
                              <Shield className="h-3 w-3 mr-1" /> Tournament Administrator
                            </Badge>
                          )}
                        </h3>
                        <Button size="sm" onClick={() => setAddPlayerDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Player
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingPlayers ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : players?.length === 0 ? (
                        <div className="text-center p-6">
                          <p className="text-gray-500 mb-4">No players in this tournament yet.</p>
                          <Button size="sm" onClick={() => setAddPlayerDialogOpen(true)}>
                            Add First Player
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Search Bar */}
                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <Input
                                placeholder="Search players..."
                                value={playerSearchQuery}
                                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            {playerSearchQuery && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPlayerSearchQuery("")}
                              >
                                Clear
                              </Button>
                            )}
                          </div>

                          {isAdmin && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                              <div className="flex items-start">
                                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-amber-800">Tournament Administrator Controls</h4>
                                  <p className="text-sm text-amber-700 mt-1">
                                    As the tournament administrator, you can grant other players permission to record game results.
                                    You can also designate other administrators to help manage this tournament.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Enhanced Player List with Permissions */}
                          <PlayerListWithPermissions 
                            tournamentId={tournamentId}
                            onRemovePlayer={(playerId) => removePlayerMutation.mutate(playerId)}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Teams Tab */}
                <TabsContent value="teams">
                  <Card>
                    <CardContent className="p-6">
                      <TeamList tournamentId={tournamentId} />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium">Tournament Settings</h3>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500">Configure tournament settings, leaderboard formulas, and more.</p>
                      {/* Tournament settings form would go here */}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Admin Activity Logs Tab - Only visible to admins */}
                {isAdmin && (
                  <TabsContent value="admin-logs">
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Administrator Activity Logs</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          View a record of all administrative actions taken in this tournament.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <AdminActivityLogs tournamentId={tournamentId} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />

      {/* Record Game Dialog */}
      <Dialog open={recordGameDialogOpen} onOpenChange={setRecordGameDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Record Game Result</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Enter the details of the game result for {tournament.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <RecordGameForm
              tournamentId={tournamentId}
              onSuccess={() => {
                setRecordGameDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: [`/api/games`] });
                toast({
                  title: "Game recorded!",
                  description: "The game result has been recorded successfully.",
                  duration: 3000,
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog open={addPlayerDialogOpen} onOpenChange={setAddPlayerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Player to Tournament</DialogTitle>
            <DialogDescription>
              Add an existing player or create a new one to add to {tournament.name}.
            </DialogDescription>
          </DialogHeader>
          <PlayerForm
            tournamentId={tournamentId}
            onSuccess={() => {
              setAddPlayerDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/players`] });
              toast({
                title: "Player added!",
                description: "The player has been added to the tournament successfully."
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={imageUploadDialogOpen} onOpenChange={setImageUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Tournament Image</DialogTitle>
            <DialogDescription>
              Enter an image URL to customize your tournament appearance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                id="imageUrl"
                type="url"
                value={uploadedImageUrl}
                onChange={(e) => setUploadedImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {uploadedImageUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                <img 
                  src={uploadedImageUrl} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded-md border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImageUploadDialogOpen(false);
                setUploadedImageUrl("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateTournamentImageMutation.mutate(uploadedImageUrl)}
              disabled={!uploadedImageUrl || updateTournamentImageMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateTournamentImageMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Update Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Game Detail Dialog */}
      <Dialog open={gameDetailDialogOpen} onOpenChange={setGameDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Game Details</DialogTitle>
            <DialogDescription>
              View complete game information and participants
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingGameDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : selectedGameParticipants && selectedGameParticipants.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedGameParticipants.map((participant: any, index: number) => (
                  <div key={participant.id} className={`p-4 rounded-lg border ${participant.is_winner ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="font-medium text-lg">
                      {participant.team_name || participant.player_name || "Unknown"}
                    </div>
                    <div className="text-2xl font-bold mt-2">
                      {participant.score || 0}
                    </div>
                    <div className={`text-sm mt-1 ${participant.is_winner ? 'text-green-600' : 'text-red-600'}`}>
                      {participant.is_winner ? 'Winner' : 'Loser'}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Game Info */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Game Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Game ID: {selectedGameId}</div>
                  <div>Date: {selectedGame?.date ? new Date(selectedGame.date).toLocaleString() : 'Not specified'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No game data available</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGameDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tournament Delete Confirmation Dialog */}
      <Dialog open={tournamentDeleteDialogOpen} onOpenChange={setTournamentDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tournament? This action cannot be undone and will remove all associated games and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTournamentDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteTournamentMutation.mutate();
                setTournamentDeleteDialogOpen(false);
              }}
              disabled={deleteTournamentMutation.isPending}
            >
              {deleteTournamentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Tournament"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Player Action Dialog */}
      <Dialog open={playerActionDialogOpen} onOpenChange={setPlayerActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              {selectedPlayer ? `Edit ${selectedPlayer.name}'s information` : "Edit player information"}
            </DialogDescription>
          </DialogHeader>
          {selectedPlayer && (
            <PlayerForm 
              player={selectedPlayer}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/players`] });
                setPlayerActionDialogOpen(false);
                setSelectedPlayer(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
