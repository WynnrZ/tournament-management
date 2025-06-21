import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Player } from "@shared/schema";

interface TeamFormProps {
  tournamentId: string;
  onSuccess?: () => void;
}

// Extend the base schema with validation
const teamFormSchema = z.object({
  name: z.string().min(2, { message: "Team name must be at least 2 characters" }),
  description: z.string().optional(),
  playerCount: z.number().min(2, { message: "Teams must have at least 2 players" }),
  playerIds: z.array(z.string()).min(2, { message: "Teams must have at least 2 players" }),
});

export default function TeamForm({ tournamentId, onSuccess }: TeamFormProps) {
  const { toast } = useToast();
  const [playerCount, setPlayerCount] = useState(2);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  // Fetch tournament players
  const { data: players, isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: [`/api/tournaments/${tournamentId}/players`],
  });

  // Form setup
  const form = useForm<z.infer<typeof teamFormSchema>>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      description: "",
      playerCount: 2,
      playerIds: [],
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: z.infer<typeof teamFormSchema>) => {
      const teamData = {
        tournamentId,
        name: data.name,
        description: data.description || "",
        playerIds: data.playerIds,
      };
      
      const res = await apiRequest("POST", "/api/teams", teamData);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all team-related queries to ensure immediate updates
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}`] });
      
      toast({
        title: "Team created!",
        description: "The team has been created successfully."
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update player count
  const handlePlayerCountChange = (value: string) => {
    const count = parseInt(value);
    setPlayerCount(count);
    form.setValue("playerCount", count);
  };

  // Add player to team
  const handleAddPlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId) || selectedPlayers.length >= playerCount) {
      return;
    }
    
    const newSelectedPlayers = [...selectedPlayers, playerId];
    setSelectedPlayers(newSelectedPlayers);
    form.setValue("playerIds", newSelectedPlayers);
  };

  // Remove player from team
  const handleRemovePlayer = (playerId: string) => {
    const newSelectedPlayers = selectedPlayers.filter(id => id !== playerId);
    setSelectedPlayers(newSelectedPlayers);
    form.setValue("playerIds", newSelectedPlayers);
  };

  // Handle form submission
  function onSubmit(data: z.infer<typeof teamFormSchema>) {
    // Make sure we have enough players
    if (selectedPlayers.length < data.playerCount) {
      toast({
        title: "Not enough players",
        description: `Please select ${data.playerCount} players for this team.`,
        variant: "destructive",
      });
      return;
    }
    
    createTeamMutation.mutate(data);
  }

  // Find player by ID
  const getPlayerName = (playerId: string) => {
    return players?.find(player => player.id === playerId)?.name || "Unknown Player";
  };

  // Get available players (not already selected)
  const availablePlayers = players?.filter(player => !selectedPlayers.includes(player.id)) || [];

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter team name" {...field} className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter team description" {...field} value={field.value || ""} className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="playerCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Players</FormLabel>
              <Select 
                value={field.value.toString()} 
                onValueChange={handlePlayerCountChange}
              >
                <FormControl>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select number of players" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="2">2 Players</SelectItem>
                  <SelectItem value="3">3 Players</SelectItem>
                  <SelectItem value="4">4 Players</SelectItem>
                  <SelectItem value="5">5 Players</SelectItem>
                  <SelectItem value="6">6 Players</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Team Members</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPlayers.map((playerId) => (
                <div
                  key={playerId}
                  className="flex items-center bg-primary/10 text-primary rounded-md px-3 py-1"
                >
                  {getPlayerName(playerId)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-2"
                    onClick={() => handleRemovePlayer(playerId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {selectedPlayers.length === 0 && (
                <p className="text-sm text-muted-foreground">No players selected yet</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Add Players</h3>
            {isLoadingPlayers ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : availablePlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No more available players</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availablePlayers.map((player) => (
                  <Button
                    key={player.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start text-base"
                    onClick={() => handleAddPlayer(player.id)}
                    disabled={selectedPlayers.length >= playerCount}
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    {player.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={createTeamMutation.isPending || selectedPlayers.length < playerCount}
        >
          {createTeamMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Team"
          )}
        </Button>
        </form>
      </Form>
    </div>
  );
}