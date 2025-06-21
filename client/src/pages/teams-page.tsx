import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Users, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Team, Tournament } from "@shared/schema";
import TeamForm from "@/components/teams/team-form";
import { useLocation } from "wouter";

export default function TeamsPage() {
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);

  // Fetch tournaments
  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
  });

  // Fetch all teams for all tournaments
  const { data: allTeams, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Filter teams by search query
  const filteredTeams = allTeams?.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  // Get tournament name by ID
  const getTournamentName = (tournamentId: number) => {
    const tournament = tournaments?.find(t => t.id === tournamentId);
    return tournament ? tournament.name : "Unknown Tournament";
  };

  // Display tournament selection dialog when creating a team
  const handleCreateTeamClick = () => {
    if (tournaments && tournaments.length === 1) {
      // If there's only one tournament, select it automatically
      setSelectedTournamentId(tournaments[0].id);
      setCreateTeamDialogOpen(true);
    } else {
      // Open tournament selection dialog
      setSelectedTournamentId(null);
      setCreateTeamDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 px-4 md:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
                <p className="text-muted-foreground mt-1">
                  Forge championship squads and coordinate team strategies for tournament victory.
                </p>
              </div>
              <Button 
                className="mt-4 sm:mt-0"
                onClick={handleCreateTeamClick}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search teams..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Teams List */}
            {isLoadingTeams ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTeams?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
                <h3 className="mt-4 text-lg font-semibold">No teams found</h3>
                <p className="mt-2 text-muted-foreground">
                  {searchQuery ? "Try a different search query" : "Get started by creating a team"}
                </p>
                <Button
                  className="mt-4"
                  onClick={handleCreateTeamClick}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create a team
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams?.map((team) => (
                  <Card key={team.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle>{team.name}</CardTitle>
                      <CardDescription>
                        {getTournamentName(team.tournamentId)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-4">
                        {team.description || "No description provided"}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        <span>{team.playerCount || 0} members</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Created {formatDate(team.createdAt)}</span>
                      </div>
                      <Separator className="my-4" />
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setLocation(`/teams/${team.id}`)}
                      >
                        View Team
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      <MobileNav />

      {/* Create Team Dialog */}
      <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Add a new team to your tournament with selected players.
            </DialogDescription>
          </DialogHeader>

          {!selectedTournamentId ? (
            <div className="space-y-4">
              <div className="text-sm font-medium">Select Tournament</div>
              <div className="grid grid-cols-1 gap-2">
                {isLoadingTournaments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : tournaments?.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No tournaments available</p>
                    <Button
                      className="mt-4"
                      onClick={() => setLocation("/tournaments/new")}
                      variant="outline"
                      size="sm"
                    >
                      Create a tournament first
                    </Button>
                  </div>
                ) : (
                  tournaments?.map((tournament) => (
                    <Card 
                      key={tournament.id} 
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => setSelectedTournamentId(tournament.id)}
                    >
                      <CardContent className="p-4">
                        <div className="font-medium">{tournament.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {tournament.gameType || "No game type specified"}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ) : (
            <TeamForm 
              tournamentId={selectedTournamentId}
              onSuccess={() => {
                setCreateTeamDialogOpen(false);
                setSelectedTournamentId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}