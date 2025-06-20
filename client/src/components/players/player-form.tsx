import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlayerSchema, Player } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlayerFormProps {
  tournamentId?: number;
  player?: Player; // For editing existing players
  onSuccess?: () => void;
  standalone?: boolean; // For standalone player creation (from Players page)
}

export default function PlayerForm({ tournamentId, player, onSuccess, standalone = false }: PlayerFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  // Fetch all players first
  const { data: allPlayers, isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  // Fetch tournament players if we have a tournament ID
  const { data: tournamentPlayers } = useQuery<Player[]>({
    queryKey: [`/api/tournaments/${tournamentId}/players`],
    enabled: !!tournamentId,
  });

  // Show existing tournament players for re-adding or all players for standalone management
  const availablePlayers = tournamentId 
    ? tournamentPlayers || [] // Show existing tournament players for re-adding
    : allPlayers || []; // Show all players for standalone player management

  // Create player form with username, email and password validation for new players
  const playerFormSchema = insertPlayerSchema.extend({
    username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Please enter a valid email address").min(1, "Email is required for player login access"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    confirmPassword: z.string().optional(),
  }).refine(
    (data) => !data.password || data.password === data.confirmPassword,
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }
  );

  const newPlayerForm = useForm<z.infer<typeof playerFormSchema>>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      contact: "",
    },
  });

  // Create new player mutation
  const createPlayerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof playerFormSchema>) => {
      const res = await apiRequest("POST", "/api/players", data);
      return await res.json();
    },
    onSuccess: (player) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      
      // If tournamentId is provided, add player to tournament
      if (tournamentId) {
        addToTournamentMutation.mutate({
          playerId: player.id,
          isAdministrator: false,
          canRecordResults: false
        });
      } else if (onSuccess) {
        onSuccess();
      }
      
      // Refresh tournament players cache immediately
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/players`] });
      }
      
      toast({
        title: "Player created!",
        description: "The player has been created successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create player",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add existing player to tournament mutation
  const addToTournamentMutation = useMutation({
    mutationFn: async (data: { playerId: string, isAdministrator?: boolean, canRecordResults?: boolean }) => {
      if (!tournamentId) throw new Error("Tournament ID is required");
      console.log(`Adding player ${data.playerId} to tournament ${tournamentId}`);
      try {
        const res = await apiRequest(
          "POST", 
          `/api/tournaments/${tournamentId}/players/${data.playerId}`, 
          data
        );
        return await res.json();
      } catch (error) {
        console.error("Error adding player to tournament:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/players`] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      
      // Switch to Tournament Players tab to show the newly added player
      setActiveTab("existing");
      
      if (onSuccess) {
        onSuccess();
      }
      toast({
        title: "Player added to tournament!",
        description: "The player has been added to the tournament successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add player to tournament",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmitNewPlayer(values: z.infer<typeof playerFormSchema>) {
    // Ensure email is required
    const playerData = {
      ...values,
      email: values.email || '', // Ensure email is never null
      subscriptionStatus: 'free_trial' as const, // Auto-assign 3-month trial
      subscriptionValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
      isActive: true
    };
    createPlayerMutation.mutate(playerData);
  }

  // Handle adding existing player
  function onAddExistingPlayer() {
    console.log("🔍 Selected player value:", selectedPlayer);
    console.log("🔍 Available players:", availablePlayers);
    console.log("🔍 Tournament players:", tournamentPlayers);
    
    if (!selectedPlayer || selectedPlayer === "loading" || selectedPlayer === "none") {
      toast({
        title: "Please select a player",
        variant: "destructive",
      });
      return;
    }

    // Define player permissions: default is regular player with no special permissions
    const playerData = {
      playerId: selectedPlayer,
      isAdministrator: false,
      canRecordResults: false
    };
    
    console.log("Player data to add:", playerData);
    addToTournamentMutation.mutate(playerData);
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto space-y-6 pr-2">
      {tournamentId && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "existing" | "new")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Tournament Players</TabsTrigger>
            <TabsTrigger value="new">Create New Player</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing">
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select Player</label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPlayers ? (
                      <SelectItem value="loading" disabled>
                        Loading players...
                      </SelectItem>
                    ) : availablePlayers?.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No available players
                      </SelectItem>
                    ) : (
                      availablePlayers?.map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          {player.name} {player.email && `(${player.email})`}
                        </SelectItem>
                      )) || []
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={onAddExistingPlayer}
                disabled={!selectedPlayer || addToTournamentMutation.isPending}
                className="w-full"
              >
                {addToTournamentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Player to Tournament"
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="new">
            <Form {...newPlayerForm}>
              <form onSubmit={newPlayerForm.handleSubmit(onSubmitNewPlayer)} className="space-y-4 pt-4">
                <FormField
                  control={newPlayerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter unique username for login" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPlayerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter player's display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPlayerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter player email for login access" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPlayerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password{standalone ? " *" : " (Optional)"}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password if player needs login access" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPlayerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm password" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPlayerForm.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact information" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={createPlayerMutation.isPending}
                  className="w-full"
                >
                  {createPlayerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    tournamentId ? "Create & Add to Tournament" : "Create Player"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      )}

      {/* If no tournamentId, just show the new player form */}
      {!tournamentId && (
        <Form {...newPlayerForm}>
          <form onSubmit={newPlayerForm.handleSubmit(onSubmitNewPlayer)} className="space-y-4">
            <FormField
              control={newPlayerForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter player name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={newPlayerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter player email for login access" 
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={newPlayerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (Optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password for login access" 
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={newPlayerForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm password" 
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={newPlayerForm.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact information" 
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              disabled={createPlayerMutation.isPending}
              className="w-full"
            >
              {createPlayerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Player"
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
