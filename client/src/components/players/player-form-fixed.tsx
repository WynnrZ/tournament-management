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
  player?: Player;
  onSuccess?: () => void;
  standalone?: boolean;
}

export default function PlayerFormFixed({ tournamentId, player, onSuccess, standalone = false }: PlayerFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  // Fetch only available players (not already in tournament) when adding to specific tournament
  const { data: availablePlayers, isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: tournamentId ? [`/api/tournaments/${tournamentId}/available-players`] : ["/api/players"],
  });

  const createPlayerSchema = insertPlayerSchema.extend({
    confirmPassword: z.string().optional(),
  }).refine(
    (data) => !data.password || data.password === data.confirmPassword,
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }
  );

  const form = useForm<z.infer<typeof createPlayerSchema>>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: {
      name: player?.name || "",
      email: player?.email || "",
      password: "",
      confirmPassword: "",
      contact: player?.contact || "",
      subscriptionStatus: player?.subscriptionStatus || "free_trial",
      subscriptionValidUntil: player?.subscriptionValidUntil || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: player?.isActive ?? true,
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createPlayerSchema>) => {
      const playerData = {
        name: data.name,
        email: data.email || null,
        password: data.password || null,
        contact: data.contact,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionValidUntil: data.subscriptionValidUntil,
        isActive: data.isActive,
      };
      
      const res = await apiRequest("POST", "/api/players", playerData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/available-players`] });
      }
      toast({
        title: "Player created!",
        description: "The player has been created successfully."
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create player",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addExistingPlayerMutation = useMutation({
    mutationFn: async () => {
      if (!tournamentId || !selectedPlayer) return;
      
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/players`, {
        playerId: selectedPlayer,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/players`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/available-players`] });
      toast({
        title: "Player added!",
        description: "The player has been added to the tournament successfully."
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add player",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: z.infer<typeof createPlayerSchema>) {
    createPlayerMutation.mutate(data);
  }

  function handleAddExistingPlayer() {
    if (!selectedPlayer) {
      toast({
        title: "No player selected",
        description: "Please select a player to add to the tournament.",
        variant: "destructive",
      });
      return;
    }
    addExistingPlayerMutation.mutate();
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {!standalone && tournamentId && (
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as "existing" | "new")}>
          <TabsList className="grid w-full grid-cols-2 text-sm">
            <TabsTrigger value="existing" className="text-xs sm:text-sm">Add Existing Player</TabsTrigger>
            <TabsTrigger value="new" className="text-xs sm:text-sm">Create New Player</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Player</label>
                {isLoadingPlayers ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a player to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers?.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} {player.email && `(${player.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <Button 
                onClick={handleAddExistingPlayer}
                disabled={addExistingPlayerMutation.isPending || !selectedPlayer}
                className="w-full"
              >
                {addExistingPlayerMutation.isPending ? (
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
            <CreatePlayerForm />
          </TabsContent>
        </Tabs>
      )}

      {(standalone || !tournamentId) && <CreatePlayerForm />}
    </div>
  );

  function CreatePlayerForm() {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Player Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter player name" {...field} className="text-base w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Enter email address" 
                    {...field} 
                    value={field.value || ""} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter password" 
                      {...field} 
                      value={field.value || ""} 
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirm password" 
                      {...field} 
                      value={field.value || ""} 
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Information</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Phone number, Discord, etc." 
                    {...field} 
                    value={field.value || ""} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="subscriptionStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select subscription status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free_trial">Free Trial</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annually">Annual</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Player</FormLabel>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={createPlayerMutation.isPending}
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
    );
  }
}