import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  ArrowLeft, 
  Edit, 
  UserPlus, 
  Users, 
  Trophy,
  Calendar,
  Settings,
  UserMinus
} from "lucide-react";
import { format } from "date-fns";
import { Team, Player, Tournament } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function TeamManagementPage() {
  const { teamId } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false);
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  // Fetch team details
  const { data: team, isLoading: isLoadingTeam } = useQuery<Team>({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
  });

  // Fetch team members
  const { data: teamMembers, isLoading: isLoadingMembers } = useQuery<Player[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: !!teamId,
  });

  // Fetch all players for adding to team
  const { data: allPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  // Fetch tournament details
  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${team?.tournamentId}`],
    enabled: !!team?.tournamentId,
  });

  // Edit team mutation
  const editTeamMutation = useMutation({
    mutationFn: async (updatedTeam: Partial<Team>) => {
      const res = await apiRequest("PATCH", `/api/teams/${teamId}`, updatedTeam);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}`] });
      toast({
        title: "Success",
        description: "Team updated successfully",
      });
      setEditTeamDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add player to team mutation
  const addPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/members`, { playerId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      toast({
        title: "Success",
        description: "Player added to team successfully",
      });
      setAddPlayerDialogOpen(false);
      setSelectedPlayerId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove player from team mutation
  const removePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const res = await apiRequest("DELETE", `/api/teams/${teamId}/members/${playerId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      toast({
        title: "Success",
        description: "Player removed from team",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedTeam = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };
    editTeamMutation.mutate(updatedTeam);
  };

  const handleAddPlayer = () => {
    if (!selectedPlayerId) return;
    addPlayerMutation.mutate(selectedPlayerId);
  };

  const handleRemovePlayer = (playerId: string) => {
    removePlayerMutation.mutate(playerId);
  };

  // Filter available players (not already in this team)
  const availablePlayers = allPlayers?.filter(player => 
    !teamMembers?.some(member => member.id === player.id)
  ) || [];

  if (isLoadingTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Team not found</h2>
          <p className="text-muted-foreground mt-2">The team you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/teams")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 px-4 md:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/teams")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Teams
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
                <p className="text-muted-foreground mt-1">
                  Team management and member coordination
                </p>
              </div>
              <Dialog open={editTeamDialogOpen} onOpenChange={setEditTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="mt-4 sm:mt-0">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Team</DialogTitle>
                    <DialogDescription>
                      Update team information and settings.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEditTeam} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Team Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={team.name}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={team.description || ""}
                        placeholder="Enter team description..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditTeamDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={editTeamMutation.isPending}>
                        {editTeamMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Info */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Team Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Team Name</Label>
                      <p className="text-sm text-muted-foreground">{team.name}</p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground">
                        {team.description || "No description provided"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Tournament</Label>
                      <p className="text-sm text-muted-foreground">
                        {tournament?.name || "Loading..."}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Members</Label>
                      <p className="text-sm text-muted-foreground">
                        {teamMembers?.length || 0} players
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm text-muted-foreground">
                        {team.createdAt ? format(new Date(team.createdAt), "MMM dd, yyyy") : "TBD"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Team Members */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Team Members
                      </CardTitle>
                      <Dialog open={addPlayerDialogOpen} onOpenChange={setAddPlayerDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Player
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Player to Team</DialogTitle>
                            <DialogDescription>
                              Select a player to add to this team.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Select Player</Label>
                              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a player..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePlayers.map((player) => (
                                    <SelectItem key={player.id} value={player.id}>
                                      {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setAddPlayerDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleAddPlayer}
                                disabled={!selectedPlayerId || addPlayerMutation.isPending}
                              >
                                {addPlayerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Player
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingMembers ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : teamMembers?.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
                        <h3 className="mt-4 text-lg font-semibold">No team members</h3>
                        <p className="mt-2 text-muted-foreground">
                          Start by adding players to this team.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamMembers?.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {member.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{member.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {member.createdAt ? format(new Date(member.createdAt), "MMM dd, yyyy") : "TBD"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePlayer(member.id)}
                                  disabled={removePlayerMutation.isPending}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}