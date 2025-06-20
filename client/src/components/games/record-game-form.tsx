import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, AlertTriangle, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTournamentPermissions } from "@/hooks/use-tournament-permissions";
import { Tournament, Player, Team } from "@shared/schema";

interface RecordGameFormProps {
  tournamentId: string;
  onSuccess?: () => void;
}

// Form schema
// Schema with conditional validation based on game type
const gameParticipantSchema = z.object({
  playerId: z.string().optional(),
  teamId: z.string().optional(),
  score: z.string().refine(val => !isNaN(Number(val)), {
    message: "Score must be a number",
  }),
  isWinner: z.boolean().default(false),
});

const gameFormSchema = z.object({
  date: z.string(),
  isTeamGame: z.boolean().default(false),
  notes: z.string().optional(),
  participants: z.array(gameParticipantSchema).min(2, "At least two participants are required"),
}).refine(data => {
  // At least one participant must be marked as winner
  return data.participants.some(p => p.isWinner);
}, {
  message: "At least one participant must be marked as winner",
  path: ["participants"],
});

export default function RecordGameForm({ tournamentId, onSuccess }: RecordGameFormProps) {
  const { toast } = useToast();
  const [isTeamGame, setIsTeamGame] = useState(false);
  const [searchTerms, setSearchTerms] = useState<{[key: string]: string}>({});
  const { user } = useAuth();
  
  // Check if current user has permission to record results
  const { canRecordResults, isAdmin } = useTournamentPermissions(tournamentId.toString());

  // Fetch tournament data
  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
  });

  // Fetch players for this tournament
  const { data: players } = useQuery<Player[]>({
    queryKey: [`/api/tournaments/${tournamentId}/players`],
  });

  // Fetch teams for this tournament (always fetch to have them ready)
  const { data: teams } = useQuery<Team[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
  });

  // Fetch team members for validation
  const { data: allTeamMembers } = useQuery<any[]>({
    queryKey: [`/api/teams/members`],
    enabled: !!teams && teams.length > 0,
  });

  // Helper function to get search term for a specific participant
  const getSearchTerm = (participantIndex: number, type: 'player' | 'team') => {
    return searchTerms[`${participantIndex}-${type}`] || '';
  };

  // Helper function to set search term for a specific participant
  const setSearchTerm = (participantIndex: number, type: 'player' | 'team', value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [`${participantIndex}-${type}`]: value
    }));
  };

  // Filter players based on search term for specific participant
  const getFilteredPlayers = (participantIndex: number) => {
    const searchTerm = getSearchTerm(participantIndex, 'player');
    return players?.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  };

  // Filter teams based on search term for specific participant
  const getFilteredTeams = (participantIndex: number) => {
    const searchTerm = getSearchTerm(participantIndex, 'team');
    return teams?.filter(team =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  };

  // Form setup
  const form = useForm<z.infer<typeof gameFormSchema>>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      isTeamGame: false,
      notes: "",
      participants: [
        { playerId: "", score: "", isWinner: false },
        { playerId: "", score: "", isWinner: false },
      ],
    },
  });

  // Field array for participants
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  // Watch for changes to isTeamGame
  const watchIsTeamGame = form.watch("isTeamGame");
  if (watchIsTeamGame !== isTeamGame) {
    setIsTeamGame(watchIsTeamGame);
    
    // Reset participants when game type changes
    form.setValue("participants", [
      { 
        playerId: "", 
        teamId: watchIsTeamGame ? "" : undefined,
        score: "", 
        isWinner: false 
      },
      { 
        playerId: "", 
        teamId: watchIsTeamGame ? "" : undefined,
        score: "", 
        isWinner: false 
      }
    ]);
  }

  // Record game mutation
  const recordGameMutation = useMutation({
    mutationFn: async (data: z.infer<typeof gameFormSchema>) => {
      // Format data for API
      const formattedData = {
        game: {
          tournamentId,
          // Use the user-selected date instead of current date
          date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
          isTeamGame: data.isTeamGame,
          notes: data.notes || "",
          createdBy: user?.id || null,
        },
        participants: data.participants.map(p => {
          // For team games, we only need teamId, not playerId
          if (data.isTeamGame) {
            return {
              playerId: null,  // Set to null for team games
              teamId: p.teamId || null,  // Keep as string (UUID)
              score: parseFloat(p.score || "0").toString(),
              isWinner: Boolean(p.isWinner),
            };
          } else {
            // For individual games, use playerId
            return {
              playerId: p.playerId || null,  // Keep as string (UUID)
              teamId: null,
              score: parseFloat(p.score || "0").toString(),
              isWinner: Boolean(p.isWinner),
            };
          }
        }),
      };

      const res = await apiRequest("POST", "/api/games", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: [`/api/games`, { tournamentId }] });
      toast({
        title: "Game recorded successfully",
        description: "The game result has been saved.",
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(data: z.infer<typeof gameFormSchema>) {
    console.log("Form submitted with data:", data);
    
    // Check if all required fields are filled for participants
    const isValid = data.participants.every(p => {
      if (data.isTeamGame) {
        // For team games, only teamId and score are required
        return !!p.teamId && !!p.score;
      } else {
        // For individual games, only playerId and score are required
        return !!p.playerId && !!p.score;
      }
    });
    
    if (!isValid) {
      console.error("Validation failed. Participants data:", data.participants);
      toast({
        title: "Form validation failed",
        description: data.isTeamGame 
          ? "Please select a team and enter a score for each participant" 
          : "Please select a player and enter a score for each participant",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Check for duplicate players/teams
    if (data.isTeamGame) {
      const teamIds = data.participants.map(p => p.teamId).filter(Boolean);
      const uniqueTeamIds = new Set(teamIds);
      if (teamIds.length !== uniqueTeamIds.size) {
        toast({
          title: "Duplicate teams detected",
          description: "The same team cannot participate multiple times in a single game",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // For team games, check if same player appears across different teams
      const teamPlayerMap = new Map<string, string[]>();
      
      // Group players by team
      data.participants.forEach(p => {
        if (p.playerId && p.teamId) {
          if (!teamPlayerMap.has(p.teamId)) {
            teamPlayerMap.set(p.teamId, []);
          }
          teamPlayerMap.get(p.teamId)!.push(p.playerId);
        }
      });
      
      // Check for duplicate players across teams
      const allPlayerIds: string[] = [];
      teamPlayerMap.forEach(playerIds => {
        allPlayerIds.push(...playerIds);
      });
      
      const uniquePlayerIds = new Set(allPlayerIds);
      if (allPlayerIds.length !== uniquePlayerIds.size) {
        toast({
          title: "Duplicate players detected",
          description: "The same player cannot appear on multiple teams in a single game",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      // Check for duplicate players within the same team
      for (const teamId of Array.from(teamPlayerMap.keys())) {
        const playerIds = teamPlayerMap.get(teamId)!;
        const uniqueTeamPlayerIds = new Set(playerIds);
        if (playerIds.length !== uniqueTeamPlayerIds.size) {
          toast({
            title: "Duplicate players detected",
            description: `The same player cannot appear multiple times on the same team`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
      }
    } else {
      const playerIds = data.participants.map(p => p.playerId).filter(Boolean);
      const uniquePlayerIds = new Set(playerIds);
      if (playerIds.length !== uniquePlayerIds.size) {
        toast({
          title: "Duplicate players detected",
          description: "The same player cannot participate multiple times in a single game",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
    }
    
    // At least one participant must be marked as winner
    if (!data.participants.some(p => p.isWinner)) {
      toast({
        title: "Form validation failed",
        description: "At least one participant must be marked as winner",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Proceed with the mutation
    try {
      recordGameMutation.mutate(data);
    } catch (error) {
      console.error("Error submitting game:", error);
      toast({
        title: "Error submitting game",
        description: "An unexpected error occurred while submitting the game. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }

  // Add participant
  const addParticipant = () => {
    append({ 
      playerId: "", 
      teamId: isTeamGame ? "" : undefined,
      score: "", 
      isWinner: false 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-full overflow-hidden">
        <div className="grid grid-cols-1 gap-4 w-full">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="text-sm sm:text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isTeamGame"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 sm:p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm sm:text-base">Team Game</FormLabel>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Is this a game between teams?
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Add any notes about this game" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-4">Participants</h3>
          
          {fields.map((field, index) => (
            <div key={field.id} className="p-3 sm:p-4 border rounded-lg mb-3 sm:mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-sm sm:text-base">Participant {index + 1}</h4>
                {index > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-8 px-2 text-red-500"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 mb-3">
                <FormField
                  control={form.control}
                  name={`participants.${index}.${isTeamGame ? 'teamId' : 'playerId'}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">{isTeamGame ? "Team" : "Player"}</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="text-sm sm:text-base">
                            <SelectValue placeholder={`Select ${isTeamGame ? 'team' : 'player'}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[250px] sm:max-h-[300px]">
                          <div className="sticky top-0 bg-background border-b p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder={`Search ${isTeamGame ? 'teams' : 'players'}...`}
                                value={getSearchTerm(index, isTeamGame ? 'team' : 'player')}
                                onChange={(e) => setSearchTerm(index, isTeamGame ? 'team' : 'player', e.target.value)}
                                className="pl-8 text-sm"
                                onFocus={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-[150px] sm:max-h-[200px]">
                            {isTeamGame ? (
                              getFilteredTeams(index).length > 0 ? getFilteredTeams(index).map((team) => (
                                <SelectItem key={team.id} value={team.id.toString()}>
                                  {team.name}
                                </SelectItem>
                              )) : (
                                <div className="p-2 text-sm text-muted-foreground">No teams found</div>
                              )
                            ) : (
                              getFilteredPlayers(index).length > 0 ? getFilteredPlayers(index).map((player) => (
                                <SelectItem key={player.id} value={player.id.toString()}>
                                  {player.name}
                                </SelectItem>
                              )) : (
                                <div className="p-2 text-sm text-muted-foreground">No players found</div>
                              )
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name={`participants.${index}.score`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Score</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter score" {...field} className="text-sm sm:text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`participants.${index}.isWinner`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 sm:p-4 sm:mt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm sm:text-base">Winner</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParticipant}
            className="w-full text-sm sm:text-base"
          >
            <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Add Participant
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <Button 
            type="submit"
            disabled={recordGameMutation.isPending}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            {recordGameMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Game"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
